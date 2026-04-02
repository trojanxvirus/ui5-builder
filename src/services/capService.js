/**
 * capService.js — Frontend service for the CAP OData runtime.
 *
 * Communicates with server.js endpoints:
 *   POST /api/cap/deploy  → writes CDS files, spawns cds-serve, returns serviceUrl
 *   GET  /api/cap/status  → { running, ready, pid, port }
 *   POST /api/cap/stop    → kills the CDS child process
 */

const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : "http://localhost:3001");

/**
 * Deploy a generated CAP project to the local CDS server.
 *
 * @param {Array<{path: string, content: string}>} files  All generated files
 * @returns {Promise<{ok: boolean, serviceUrl: string, port: number}>}
 */
export async function deployCAP(files) {
  const res = await fetch(`${API_BASE}/api/cap/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error ?? `CAP deploy failed (${res.status})`);
  }

  return body; // { ok, serviceUrl, port }
}

/**
 * Poll the current status of the CDS child process.
 *
 * @returns {Promise<{running: boolean, ready: boolean, pid: number|null, port: number}>}
 */
export async function getCAPStatus() {
  const res = await fetch(`${API_BASE}/api/cap/status`);
  if (!res.ok) throw new Error("Could not reach CAP status endpoint");
  return res.json();
}

/**
 * Stop the running CDS child process.
 */
export async function stopCAP() {
  await fetch(`${API_BASE}/api/cap/stop`, { method: "POST" });
}
