import { createClient } from "redis";
import crypto from "node:crypto";

let redisPromise;

export async function db() {
  if (!redisPromise) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is missing");
    const client = createClient({
      url,
      password: process.env.REDIS_TOKEN || undefined
    });
    client.on("error", (err) => console.error("Redis error:", err));
    redisPromise = client.connect().then(() => client);
  }
  return redisPromise;
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.end(JSON.stringify(body));
}

export function text(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(body);
}

export function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => {
      raw += c;
      if (raw.length > 2_000_000) req.destroy();
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error("invalid_json")); }
    });
    req.on("error", reject);
  });
}

export function requireAdmin(req, res) {
  const supplied = req.headers["x-admin-password"] || "";
  if (!process.env.ADMIN_PASSWORD || !crypto.timingSafeEqual(
    Buffer.from(String(supplied)),
    Buffer.from(String(process.env.ADMIN_PASSWORD))
  )) {
    json(res, 401, { ok:false, error:"unauthorized" });
    return false;
  }
  return true;
}

export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  return String(xff || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

export async function rateLimit(key, limit, windowSeconds) {
  const r = await db();
  const k = `rl:${key}`;
  const n = await r.incr(k);
  if (n === 1) await r.expire(k, windowSeconds);
  return { allowed: n <= limit, count: n };
}

export function randomKey() {
  return "REXZ-" + crypto.randomBytes(12).toString("hex").toUpperCase();
}

export function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function sha256(v) {
  return crypto.createHash("sha256").update(String(v)).digest("hex");
}

export function cleanHwid(v) {
  return String(v || "").trim().slice(0, 200);
}

export async function notifyBot(event) {
  const url = process.env.BOT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify(event)
    });
  } catch (e) {
    console.error("bot webhook failed", e);
  }
}
