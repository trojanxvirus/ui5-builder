/**
 * server.js — API proxy for OpenRouter + CAP OData runtime
 * Works with: BTP, Vercel, Render, SAP BAS, localhost
 *
 * CAP support: POST /api/cap/deploy writes generated CDS files to a temp
 * directory, spawns `cds-serve --in-memory --port 4004`, waits for the
 * service to be ready, then proxies all /odata/* requests to it.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "child_process";
import http from "http";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// ── CDS serve binary (absolute path so child process can find it) ─────────────
const CDS_SERVE_JS = path.join(
  __dirname,
  "node_modules",
  "@sap",
  "cds",
  "bin",
  "serve.js",
);
const CDS_PORT = 4004;
// Keep the CAP project INSIDE the repo root so Node.js module resolution
// walks up and finds node_modules/@cap-js/sqlite in our project.
const CAP_TMP_DIR = path.join(__dirname, ".cap-tmp");

/** Active CDS child process (null when not running) */
let cdsProcess = null;
let cdsReady = false;

if (!OPENROUTER_KEY) {
  console.error("❌  OPENROUTER_KEY is not set — proxy will reject all requests.");
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  CLIENT_ORIGIN,
  /^https:\/\/[a-z0-9-]+\.cfapps\.ap21\.hana\.ondemand\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/port5173-workspaces-ws-[a-z0-9]+\.ap21\.trial\.applicationstudio\.cloud\.sap$/,
  /^https:\/\/port5173-workspaces-ws-[a-z0-9]+\.ap21\.applicationstudio\.cloud\.sap$/,
  /^https:\/\/port5173-workspaces-ws-[a-z0-9]+\.[a-z0-9-]+\.applicationstudio\.cloud\.sap$/,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((o) =>
        o instanceof RegExp ? o.test(origin) : o === origin,
      );
      if (allowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "4mb" }));

// ─── Root / Health ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.json({ service: "UI5Builder API", status: "running", node: process.version }),
);
app.get("/health", (_req, res) => res.json({ ok: true }));

// ─── AI Proxy ─────────────────────────────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  if (!OPENROUTER_KEY) {
    return res.status(500).json({ error: "Server misconfiguration: API key not set." });
  }

  const { model, max_tokens, temperature, messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request body: messages array required." });
  }

  const safeMaxTokens = Math.min(max_tokens ?? 8000, 12000);

  const callOpenRouter = async (signal) => {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": CLIENT_ORIGIN,
      },
      body: JSON.stringify({
        model: model ?? "deepseek/deepseek-chat",
        max_tokens: safeMaxTokens,
        temperature: temperature ?? 0.2,
        messages,
      }),
      signal,
    });
    return r;
  };

  try {
    // 3 min — dashboard/chart templates + mermaid diagram often exceed 90s on OpenRouter
    const upstream = await callOpenRouter(AbortSignal.timeout(180_000));
    if (!upstream.ok) {
      const text = await upstream.text();
      console.error(`OpenRouter ${upstream.status}:`, text);
      const STATUS_MESSAGES = {
        402: "OpenRouter account has no credits. Add credits at openrouter.ai/credits.",
        401: "OpenRouter API key is invalid. Check OPENROUTER_KEY in environment variables.",
        429: "OpenRouter rate limit reached. Wait a moment and try again.",
        503: "OpenRouter is temporarily unavailable. Try again shortly.",
      };
      return res.status(upstream.status).json({
        error: STATUS_MESSAGES[upstream.status] ?? `OpenRouter returned ${upstream.status}.`,
      });
    }
    return res.json(await upstream.json());
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({ error: "AI request timed out. Please try again." });
    }
    const isConnReset =
      err.cause?.code === "ECONNRESET" || err.message?.includes("terminated");
    if (isConnReset) {
      console.warn("ECONNRESET — retrying once…");
      try {
        const retry = await callOpenRouter(AbortSignal.timeout(180_000));
        if (!retry.ok) return res.status(retry.status).json({ error: `OpenRouter returned ${retry.status} on retry.` });
        return res.json(await retry.json());
      } catch (retryErr) {
        console.error("Retry also failed:", retryErr.message);
        return res.status(504).json({ error: "Connection to AI was reset. Please try again." });
      }
    }
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal proxy error." });
  }
});

// ─── CAP helpers ──────────────────────────────────────────────────────────────

/** Poll localhost:port until it accepts TCP connections (service is up). */
function waitForPort(port, timeoutMs = 20_000) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tryConnect = () => {
      if (Date.now() > deadline) return resolve(false);
      const sock = net.createConnection(port, "127.0.0.1");
      sock.once("connect", () => { sock.destroy(); resolve(true); });
      sock.once("error", () => { sock.destroy(); setTimeout(tryConnect, 300); });
    };
    tryConnect();
  });
}

/** Kill the running CDS child process (if any) and reset state. */
async function killCdsProcess() {
  if (!cdsProcess) return;
  cdsProcess.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 400));
  if (!cdsProcess?.killed) cdsProcess?.kill("SIGKILL");
  cdsProcess = null;
  cdsReady = false;
}

/** Write { path, content } file list to targetDir, creating parent dirs. */
async function writeProjectFiles(targetDir, files) {
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  for (const file of files) {
    const fp = path.join(targetDir, file.path.replace(/^\/+/, ""));
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, file.content, "utf-8");
  }
}

// ─── CAP Deploy endpoint ──────────────────────────────────────────────────────
/**
 * POST /api/cap/deploy
 * Body: { files: Array<{ path: string, content: string }> }
 *
 * Writes CDS project files to a temp directory, kills any previous CDS
 * process, spawns `node <cds-serve.js> --in-memory --port 4004`, waits for
 * port 4004 to be ready, then responds with the OData base URL.
 */
app.post("/api/cap/deploy", async (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "files array is required" });
  }

  try {
    // 1. Write files to temp directory
    console.log(`[CAP] Writing ${files.length} files to ${CAP_TMP_DIR}`);
    await writeProjectFiles(CAP_TMP_DIR, files);

    // 2. Kill previous CDS process
    await killCdsProcess();

    // 3. Verify cds-serve entry point exists
    if (!fsSync.existsSync(CDS_SERVE_JS)) {
      return res.status(500).json({
        error: `@sap/cds serve.js not found at ${CDS_SERVE_JS}. Run: npm install @sap/cds`,
      });
    }

    // 4. Spawn cds-serve --in-memory --port 4004 in the temp project directory
    //    NODE_PATH ensures CDS finds its own modules from our project's node_modules.
    console.log(`[CAP] Starting cds-serve on port ${CDS_PORT}…`);
    cdsReady = false;
    cdsProcess = spawn(
      process.execPath, // node.exe
      [CDS_SERVE_JS, "--in-memory", "--port", String(CDS_PORT)],
      {
        cwd: CAP_TMP_DIR,
        env: {
          ...process.env,
          NODE_ENV: "development",
          NODE_PATH: path.join(__dirname, "node_modules"),
          // Tell CDS to use our project as the "home" so it can find adapters
          CDS_HOME: __dirname,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    cdsProcess.stdout.on("data", (d) => {
      const msg = d.toString().trim();
      if (msg) console.log(`[CAP out] ${msg}`);
      if (msg.includes("serving") || msg.includes("http://")) cdsReady = true;
    });
    cdsProcess.stderr.on("data", (d) => {
      const msg = d.toString().trim();
      if (!msg) return;
      console.error(`[CAP err] ${msg}`);
      // If CDS compile error, dump the offending .cds files for debugging
      if (msg.includes("CompilationError") || msg.includes("SyntaxError")) {
        const svcCds = path.join(CAP_TMP_DIR, "srv", "service.cds");
        const pkgJson = path.join(CAP_TMP_DIR, "package.json");
        fsSync.readFile(svcCds, "utf8", (_, c) => {
          if (c) console.error(`[CAP debug] srv/service.cds:\n${c}`);
        });
        fsSync.readFile(pkgJson, "utf8", (_, c) => {
          if (c) console.error(`[CAP debug] package.json:\n${c}`);
        });
      }
    });
    cdsProcess.on("exit", (code) => {
      console.log(`[CAP] Process exited with code ${code}`);
      cdsProcess = null;
      cdsReady = false;
    });

    // 5. Wait for port to open (up to 20 s)
    const ready = await waitForPort(CDS_PORT, 20_000);
    if (!ready) {
      await killCdsProcess();
      return res.status(500).json({
        error: "CAP service did not start within 20 s. Check server logs for CDS errors.",
      });
    }

    cdsReady = true;
    console.log(`[CAP] Service ready at http://localhost:${CDS_PORT}`);
    res.json({
      ok: true,
      serviceUrl: "/odata/v4/",
      port: CDS_PORT,
    });
  } catch (err) {
    console.error("[CAP] Deploy error:", err);
    res.status(500).json({ error: `CAP deploy failed: ${err.message}` });
  }
});

// ─── CAP Status endpoint ───────────────────────────────────────────────────────
app.get("/api/cap/status", (_req, res) => {
  res.json({
    running: !!cdsProcess && !cdsProcess.killed,
    ready: cdsReady,
    pid: cdsProcess?.pid ?? null,
    port: CDS_PORT,
  });
});

// ─── CAP Stop endpoint ─────────────────────────────────────────────────────────
app.post("/api/cap/stop", async (_req, res) => {
  await killCdsProcess();
  res.json({ ok: true });
});

// ─── OData proxy → CAP service ────────────────────────────────────────────────
// All /odata/* requests are forwarded to the locally-running CDS service.
// Uses Node's built-in http module — no third-party proxy library needed.
app.use("/odata", (req, res) => {
  // req.url is relative to the /odata mount point, e.g. /customer/$metadata
  // req.originalUrl would be /odata/customer/$metadata — CDS doesn't know /odata
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: CDS_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${CDS_PORT}` },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on("error", (err) => {
    console.error("[OData proxy error]", err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: "OData service is not running. Generate a CAP app first.",
      });
    }
  });

  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const httpServer = app.listen(PORT, () => {
  console.log(`✅  UI5Builder proxy → http://localhost:${PORT}`);
  console.log(`    Key: ${OPENROUTER_KEY ? "set ✓" : "MISSING ✗"}`);
  console.log(`    CORS origin: ${CLIENT_ORIGIN}`);
  console.log(`    CAP OData proxy: /odata → localhost:${CDS_PORT}`);
});

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌  Port ${PORT} is already in use by another process.`);
    console.error(`    Run this in PowerShell to free it, then retry:`);
    console.error(`    Get-Process -Name node | Stop-Process -Force\n`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

// Clean up CDS process on server shutdown
process.on("SIGINT", async () => { await killCdsProcess(); process.exit(0); });
process.on("SIGTERM", async () => { await killCdsProcess(); process.exit(0); });
