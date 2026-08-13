import { db, text, clientIp, rateLimit, sha256 } from "../lib.js";

export default async function handler(req,res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return text(res,405,"method_not_allowed");
  }

  const ip = clientIp(req);
  const rl = await rateLimit(ip, 60, 60);
  if (!rl.allowed) return text(res,429,"rate_limited");

  const auth = String(req.headers.authorization||"");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : String(req.query?.token||"").trim();
  if (!token) return text(res,401,"missing_token");

  // Optional additional client marker. This is only an extra layer;
  // headers can be spoofed, so the real check is the short-lived token.
  const marker = String(req.headers["x-rexz-client"]||"");
  if (process.env.CLIENT_SECRET && marker !== process.env.CLIENT_SECRET) {
    return text(res,403,"client_not_allowed");
  }

  try {
    const r = await db();
    const tokenHash = sha256(token);
    const rawSession = await r.get(`session:${tokenHash}`);
    if (!rawSession) return text(res,403,"invalid_or_expired_token");

    const session = JSON.parse(rawSession);
    if (Date.now() >= session.expiresAt) return text(res,403,"token_expired");

    const rawKey = await r.get(`key:${session.key}`);
    if (!rawKey) return text(res,403,"invalid_key");
    const item = JSON.parse(rawKey);
    if (item.revoked || Date.now() >= item.expiresAt) return text(res,403,"key_invalid");

    const script = await r.get("config:script") ?? process.env.SCRIPT_SOURCE ?? "";
    if (!script) return text(res,503,"script_not_configured");

    res.statusCode = 200;
    res.setHeader("Content-Type","text/plain; charset=utf-8");
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate");
    res.setHeader("X-Content-Type-Options","nosniff");
    return res.end(script);
  } catch(e) {
    console.error(e);
    return text(res,500,"server_error");
  }
}
