// Supabase Edge Function: POST /functions/v1/submit-lead
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server environment.
// Deploy only after CAPTCHA/rate limiting and operational checks are configured.
import { createClient } from "npm:@supabase/supabase-js@2";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async request=>{
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 const origin=request.headers.get("origin")||"";
 if(origin!=="https://rpaintersllc.com" && origin!=="https://www.rpaintersllc.com")return json({error:"Forbidden origin"},403);
 if(Number(request.headers.get("content-length")||0)>12000)return json({error:"Payload too large"},413);
 let body:Record<string,unknown>;
 try{body=await request.json();}catch{return json({error:"Invalid JSON"},400)}
 const value=(key:string)=>typeof body[key]==="string"?(body[key] as string).trim():"";
 const request_key=value("request_key");
 const full_name=value("full_name"),email=value("email"),phone=value("phone"),city=value("city"),zip=value("zip"),service=value("service"),details=value("details");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request_key))return json({error:"Invalid request ID"},400);
 if(full_name.length<2||full_name.length>120||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||phone.length<10||phone.length>30||city.length<2||city.length>100||!/^[0-9]{5}(-[0-9]{4})?$/.test(zip)||service.length<3||service.length>100||details.length<10||details.length>4000||body.contact_consent!==true)return json({error:"Check required fields and consent"},400);
 // Defense in depth: rate limiting + bot challenge required before enabling public traffic.
 if(Deno.env.get("LEAD_ENGINE_PUBLIC_SUBMISSIONS_ENABLED")!=="true")return json({error:"Submissions are not yet enabled"},503);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data,error}=await db.from("leads").insert({request_key,full_name,email,phone,city,zip,service,details,consent_at:new Date().toISOString(),source:"website",utm_source:value("utm_source").slice(0,200)||null,utm_campaign:value("utm_campaign").slice(0,200)||null}).select("id").single();
 if(error?.code==="23505")return json({ok:true,duplicate:true,request_key});
 if(error){console.error("Lead insert failed",error.code);return json({error:"Unable to confirm request"},500)}
 return json({ok:true,id:data.id,request_key},201);
});
