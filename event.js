import { json, body, requireAdmin } from "../../lib.js";

export default async function handler(req,res) {
  if (req.method !== "POST") return json(res,405,{ok:false,error:"method_not_allowed"});
  if (!requireAdmin(req,res)) return;

  try {
    const b = await body(req);
    console.log(JSON.stringify({
      source:"bot",
      receivedAt:new Date().toISOString(),
      event:b
    }));
    return json(res,200,{ok:true});
  } catch(e) {
    return json(res,400,{ok:false,error:"invalid_json"});
  }
}
