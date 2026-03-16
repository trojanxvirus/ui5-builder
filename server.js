/**
 * server.js — API proxy for OpenRouter
 *
 * Keeps OPENROUTER_KEY server-side so it never reaches the browser bundle.
 * Run alongside the Vite dev server: node server.js
 * In production: deploy this as your backend and point VITE_API_BASE to it.
 *
 * Install deps: npm install express cors dotenv
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

if (!OPENROUTER_KEY) {
  console.error(
    "❌  OPENROUTER_KEY is not set — proxy will reject all requests.",
  );
}

// ─── CORS — allow localhost, Vercel, Render, and BAS origins ─────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  CLIENT_ORIGIN,
  // SAP BAS — regex covers any workspace URL on ap21 trial
  /^https:\/\/port5173-workspaces-ws-[a-z0-9]+\.ap21\.trial\.applicationstudio\.cloud\.sap$/,
  /^https:\/\/port5173-workspaces-ws-[a-z0-9]+\.ap21\.applicationstudio\.cloud\.sap$/,
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
    methods: ["GET", "POST"],
  }),
);

app.use(express.json({ limit: "2mb" }));

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    service: "UI5Builder API",
    status: "running",
    node: process.version,
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }));

// ─── Proxy endpoint ───────────────────────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  if (!OPENROUTER_KEY) {
    return res
      .status(500)
      .json({ error: "Server misconfiguration: API key not set." });
  }

  const { model, max_tokens, temperature, messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res
      .status(400)
      .json({ error: "Invalid request body: messages array required." });
  }

  const safeMaxTokens = Math.min(max_tokens ?? 8000, 10000);

  try {
    const upstream = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
        signal: AbortSignal.timeout(90_000),
      },
    );

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
        error:
          STATUS_MESSAGES[upstream.status] ??
          `OpenRouter returned ${upstream.status}.`,
      });
    }

    const data = await upstream.json();
    return res.json(data);
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res
        .status(504)
        .json({ error: "AI request timed out. Please try again." });
    }
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal proxy error." });
  }
});

app.listen(PORT, () => {
  console.log(`✅  UI5Builder proxy running on http://localhost:${PORT}`);
  console.log(`    Key: ${OPENROUTER_KEY ? "set ✓" : "MISSING ✗"}`);
  console.log(`    CORS origin: ${CLIENT_ORIGIN}`);
});
