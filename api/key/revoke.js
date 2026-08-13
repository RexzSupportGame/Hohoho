import { db, json, body, requireAdmin, notifyBot } from "../../lib.js";

export default async function handler(req,res) {
  if (req.method !== "POST") return json(res,405,{ok:false,error:"method_not_allowed"});
  if (!requireAdmin(req,res)) return;

  try {
    const b = await body(req);
    const key = String(b.key||"").trim();
    if (!key) return json(res,400,{ok:false,error:"missing_key"});
    const r = await db();
    const raw = await r.get(`key:${key}`);
    if (!raw) return json(res,404,{ok:false,error:"not_found"});
    const item = JSON.parse(raw);
    item.revoked = true;
    await r.set(`key:${key}`, JSON.stringify(item));
    await notifyBot({event:"key_revoked",key});
    return json(res,200,{ok:true});
  } catch(e) {
    console.error(e);
    return json(res,500,{ok:false,error:"server_error"});
  }
}
