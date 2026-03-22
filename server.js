/**
 * server.js — production-ready API proxy
 * Deploys to Render (free tier) as a Node.js web service
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

// CORS — allow both localhost (dev) and the deployed Vercel frontend
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, Render health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ["GET", "POST"],
  }),
);

app.use(express.json({ limit: "2mb" }));

// ─── Root — confirms service is live ─────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    service: "UI5Builder API",
    status: "running",
    node: process.version,
  });
});

// ─── Health check — used by Render and uptime monitors ───────────────────────
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

  const safeMaxTokens = Math.min(max_tokens ?? 8000, 10000); // raised cap to match client

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
    // ECONNRESET — OpenRouter dropped the connection. Retry once automatically.
    const isConnReset =
      err.cause?.code === "ECONNRESET" || err.message?.includes("terminated");
    if (isConnReset) {
      console.warn("ECONNRESET — retrying once...");
      try {
        const retry = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": CLIENT_ORIGIN,
            },
            body: JSON.stringify({
              model: req.body.model ?? "deepseek/deepseek-chat",
              max_tokens: Math.min(req.body.max_tokens ?? 8000, 10000),
              temperature: req.body.temperature ?? 0.2,
              messages: req.body.messages,
            }),
            signal: AbortSignal.timeout(90_000),
          },
        );
        if (!retry.ok) {
          return res
            .status(retry.status)
            .json({ error: `OpenRouter returned ${retry.status} on retry.` });
        }
        const retryData = await retry.json();
        return res.json(retryData);
      } catch (retryErr) {
        console.error("Retry also failed:", retryErr.message);
        return res
          .status(504)
          .json({ error: "Connection to AI was reset. Please try again." });
      }
    }
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal proxy error." });
  }
});

app.listen(PORT, () => {
  console.log(`✅  UI5Builder proxy → http://localhost:${PORT}`);
  console.log(`    Key: ${OPENROUTER_KEY ? "set ✓" : "MISSING ✗"}`);
  console.log(`    CORS origin: ${CLIENT_ORIGIN}`);
});
