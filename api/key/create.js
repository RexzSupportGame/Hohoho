import { db, json, body, requireAdmin, randomKey, notifyBot } from "../../lib.js";

export default async function handler(req,res) {
  if (req.method !== "POST") return json(res,405,{ok:false,error:"method_not_allowed"});
  if (!requireAdmin(req,res)) return;

  try {
    const b = await body(req);
    const days = Math.max(1, Math.min(3650, Number(b.days || 7)));
    const maxHwid = Math.max(1, Math.min(20, Number(b.maxHwid || 1)));
    const key = randomKey();
    const now = Date.now();
    const item = {
      key,
      createdAt: now,
      expiresAt: now + days*86400000,
      revoked: false,
      maxHwid,
      hwids: [],
      uses: 0
    };
    const r = await db();
    await r.set(`key:${key}`, JSON.stringify(item));
    await notifyBot({event:"key_created",key,expiresAt:item.expiresAt,maxHwid});
    return json(res,200,{ok:true,key,expiresAt:item.expiresAt,maxHwid});
  } catch(e) {
    console.error(e);
    return json(res,500,{ok:false,error:"server_error"});
  }
}
