/*
server.js — production-ready API proxy
Deploys to Render (free tier) as a Node.js web service
*/
import express from “express”;
import cors from “cors”;
import dotenv from “dotenv”;
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const OPENROUTERKEY = process.env.OPENROUTERKEY;
const CLIENTORIGIN = process.env.CLIENTORIGIN || “http://localhost:5173”
;
if (!OPENROUTERKEY) {
console.error(
“❌ OPENROUTERKEY is not set — proxy will reject all requests.”,
);
}
// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allows:
// - localhost dev servers
// - CLIENTORIGIN env var (Vercel / BTP frontend URL)
// - Any SAP BAS workspace URL (regex — workspace ID changes every session)
const allowedOrigins = [
“http://localhost:5173”
,
“http://localhost:4173”
,
CLIENTORIGIN,
// SAP BAS trial workspaces — ap21 region
/^https://port5173-workspaces-ws-[a-z0-9]+.ap21.trial.applicationstudio.cloud.sap$/
,
// SAP BAS enterprise workspaces — ap21 region
/^https://port5173-workspaces-ws-[a-z0-9]+.ap21.applicationstudio.cloud.sap$/
,
// SAP BAS — other regions (eu10, us10, etc.)
/^https://port5173-workspaces-ws-[a-z0-9]+.[a-z0-9-]+.applicationstudio.cloud.sap$/
,
// BTP deployed frontend
/^https://.*.cfapps.ap21.hana.ondemand.com$/
,
].filter(Boolean);
app.use(
cors({
origin: (origin, callback) => {
// Allow requests with no origin (curl, Render health checks)
if (!origin) return callback(null, true);
  const allowed = allowedOrigins.some((o) =>
    o instanceof RegExp ? o.test(origin) : o === origin
  );
  if (allowed) {
    callback(null, true);
  } else {
    console.warn(CORS blocked: ${origin});
    callback(new Error(CORS: origin ${origin} not allowed));
  }
},
methods: ["GET", "POST", "OPTIONS"],
allowedHeaders: ["Content-Type", "Authorization"],
```
}),
);
app.use(express.json({ limit: “2mb” }));
// ─── Root — confirms service is live ─────────────────────────────────────────
app.get(”/”, (req, res) => {
res.json({
service: “UI5Builder API”,
status: “running”,
node: process.version,
});
});
// ─── Health check — used by Render and uptime monitors ───────────────────────
app.get(”/health”, (req, res) => res.json({ ok: true }));
// ─── Proxy endpoint ───────────────────────────────────────────────────────────
app.post(”/api/generate”, async (req, res) => {
if (!OPENROUTERKEY) {
return res
.status(500)
.json({ error: “Server misconfiguration: API key not set.” });
}
const { model, maxtokens, temperature, messages } = req.body;
if (!messages || !Array.isArray(messages)) {
return res
.status(400)
.json({ error: “Invalid request body: messages array required.” });
}
const safeMaxTokens = Math.min(maxtokens ?? 8000, 10000);
try {
const upstream = await fetch(
“https://openrouter.ai/api/v1/chat/completions”
,
{
method: “POST”,
headers: {
Authorization: Bearer ${OPENROUTERKEY},
“Content-Type”: “application/json”,
“HTTP-Referer”: CLIENTORIGIN,
},
body: JSON.stringify({
model: model ?? “deepseek/deepseek-chat”,
maxtokens: safeMaxTokens,
temperature: temperature ?? 0.2,
messages,
}),
signal: AbortSignal.timeout(90000),
},
);
```if (!upstream.ok) {
  const text = await upstream.text();
  console.error(OpenRouter ${upstream.status}:, text);
  const STATUSMESSAGES = {
    402: "OpenRouter account has no credits. Add credits at openrouter.ai/credits.",
    401: "OpenRouter API key is invalid. Check OPENROUTERKEY in environment variables.",
    429: "OpenRouter rate limit reached. Wait a moment and try again.",
    503: "OpenRouter is temporarily unavailable. Try again shortly.",
  };
  return res.status(upstream.status).json({
    error:
      STATUSMESSAGES[upstream.status] ??
      OpenRouter returned ${upstream.status}.,
  });
}
const data = await upstream.json();
return res.json(data);
```
} catch (err) {
if (err.name === “TimeoutError” || err.name === “AbortError”) {
return res
.status(504)
.json({ error: “AI request timed out. Please try again.” });
}
```// ECONNRESET — OpenRouter dropped the connection. Retry once automatically.
const isConnReset =
  err.cause?.code === "ECONNRESET" || err.message?.includes("terminated");
if (isConnReset) {
  console.warn("ECONNRESET — retrying once...");
  try {
    const retry = await fetch(
      "https://openrouter.ai/api/v1/chat/completions
",
      {
        method: "POST",
        headers: {
          Authorization: Bearer ${OPENROUTERKEY},
          "Content-Type": "application/json",
          "HTTP-Referer": CLIENTORIGIN,
        },
        body: JSON.stringify({
          model: req.body.model ?? "deepseek/deepseek-chat",
          maxtokens: Math.min(req.body.maxtokens ?? 8000, 10000),
          temperature: req.body.temperature ?? 0.2,
          messages: req.body.messages,
        }),
        signal: AbortSignal.timeout(90000),
      },
    );
    if (!retry.ok) {
      return res
        .status(retry.status)
        .json({ error: OpenRouter returned ${retry.status} on retry. });
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
console.log(✅` UI5Builder proxy → http://localhost:${PORT
}`);
console.log(` Key: ${OPENROUTERKEY ? "set ✓" : "MISSING ✗"}`);
console.log(` CORS origin: ${CLIENT_ORIGIN}`);
});
