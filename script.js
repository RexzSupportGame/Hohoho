import { db, json, body, requireAdmin } from "../../lib.js";

const SCRIPT_KEY = "config:script";

export default async function handler(req,res) {
  if (!requireAdmin(req,res)) return;
  const r = await db();

  try {
    if (req.method === "GET") {
      const script = await r.get(SCRIPT_KEY);
      return json(res,200,{ok:true,script:script||""});
    }

    if (req.method === "POST") {
      const b = await body(req);
      const script = String(b.script||"");
      if (!script) return json(res,400,{ok:false,error:"empty_script"});
      await r.set(SCRIPT_KEY, script);
      return json(res,200,{ok:true});
    }

    return json(res,405,{ok:false,error:"method_not_allowed"});
  } catch(e) {
    console.error(e);
    return json(res,500,{ok:false,error:"server_error"});
  }
}
