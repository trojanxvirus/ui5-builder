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
const OPENROUTER_KEY = process.env.OPENROUTER_KEY; // ← server-side only, NOT prefixed with VITE_

if (!OPENROUTER_KEY) {
  console.error(
    "❌  OPENROUTER_KEY is not set in .env — proxy will reject all requests.",
  );
}

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["POST"],
  }),
);

app.use(express.json({ limit: "2mb" }));

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

  // Hard cap — prevent runaway token usage
  const safeMaxTokens = Math.min(max_tokens ?? 6000, 8000);

  try {
    const upstream = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
        },
        body: JSON.stringify({
          model: model ?? "deepseek/deepseek-chat",
          max_tokens: safeMaxTokens,
          temperature: temperature ?? 0.2,
          messages,
        }),
        // Node 18+ native fetch — 90s upstream timeout
        signal: AbortSignal.timeout(90_000),
      },
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error(`OpenRouter error ${upstream.status}:`, text);

      const STATUS_MESSAGES = {
        402: "OpenRouter account has no credits. Add credits at openrouter.ai/credits and try again.",
        401: "OpenRouter API key is invalid or missing. Check OPENROUTER_KEY in your .env file.",
        429: "OpenRouter rate limit reached. Wait a moment and try again.",
        503: "OpenRouter is temporarily unavailable. Try again in a few seconds.",
      };

      const message =
        STATUS_MESSAGES[upstream.status] ??
        `OpenRouter returned ${upstream.status}. Check your account at openrouter.ai.`;

      return res.status(upstream.status).json({ error: message });
    }

    const data = await upstream.json();
    return res.json(data);
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.error("Upstream request timed out");
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
  console.log(
    `    Forwarding requests to OpenRouter (key: ${OPENROUTER_KEY ? "set ✓" : "MISSING ✗"})`,
  );
});
