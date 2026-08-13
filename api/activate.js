import { db, json, body, clientIp, rateLimit, randomToken, sha256, cleanHwid, notifyBot } from "../lib.js";

const MAX_ACTIVATION_PER_MINUTE = 20;

export default async function handler(req,res) {
  if (req.method !== "POST") return json(res,405,{ok:false,error:"method_not_allowed"});

  const ip = clientIp(req);
  const rl = await rateLimit(ip, MAX_ACTIVATION_PER_MINUTE, 60);
  if (!rl.allowed) return json(res,429,{ok:false,error:"rate_limited"});

  try {
    const b = await body(req);
    const key = String(b.key||"").trim();
    const hwid = cleanHwid(b.hwid);
    if (!key || !hwid) return json(res,400,{ok:false,error:"missing_key_or_hwid"});

    const r = await db();
    const raw = await r.get(`key:${key}`);
    if (!raw) return json(res,403,{ok:false,error:"invalid_key"});

    const item = JSON.parse(raw);
    if (item.revoked) return json(res,403,{ok:false,error:"key_revoked"});
    if (Date.now() >= item.expiresAt) return json(res,403,{ok:false,error:"key_expired"});

    const fingerprint = sha256(hwid);
    const list = Array.isArray(item.hwids) ? item.hwids : [];

    if (!list.includes(fingerprint) && list.length >= item.maxHwid) {
      return json(res,403,{ok:false,error:"hwid_limit_reached"});
    }

    if (!list.includes(fingerprint)) list.push(fingerprint);

    const token = randomToken();
    const tokenHash = sha256(token);
    const tokenRecord = {
      key,
      hwidHash:fingerprint,
      createdAt:Date.now(),
      expiresAt:Math.min(item.expiresAt, Date.now()+15*60*1000)
    };

    item.hwids = list;
    item.uses = Number(item.uses||0)+1;
    item.lastUse = Date.now();

    await Promise.all([
      r.set(`key:${key}`, JSON.stringify(item)),
      r.set(`session:${tokenHash}`, JSON.stringify(tokenRecord), {EX:900}),
      notifyBot({event:"key_activated",key,ip,hwidHash:fingerprint})
    ]);

    return json(res,200,{
      ok:true,
      token,
      expiresAt:tokenRecord.expiresAt,
      hwidSlots:{used:list.length,max:item.maxHwid}
    });
  } catch(e) {
    console.error(e);
    return json(res,500,{ok:false,error:"server_error"});
  }
}
