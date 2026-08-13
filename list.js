import { db, json, requireAdmin } from "../../lib.js";

export default async function handler(req,res) {
  if (req.method !== "GET") return json(res,405,{ok:false,error:"method_not_allowed"});
  if (!requireAdmin(req,res)) return;

  try {
    const r = await db();
    const keys = [];
    for await (const k of r.scanIterator({MATCH:"key:*",COUNT:100})) {
      const raw = await r.get(k);
      if (!raw) continue;
      const item = JSON.parse(raw);
      keys.push({
        key:item.key, createdAt:item.createdAt, expiresAt:item.expiresAt,
        revoked:item.revoked, maxHwid:item.maxHwid,
        hwidCount:(item.hwids||[]).length, uses:item.uses||0
      });
    }
    keys.sort((a,b)=>b.createdAt-a.createdAt);
    return json(res,200,{ok:true,keys});
  } catch(e) {
    console.error(e);
    return json(res,500,{ok:false,error:"server_error"});
  }
}
