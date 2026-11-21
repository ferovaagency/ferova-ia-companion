import { z } from "zod";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { catalogPool } from "./catalog-discoveries.server";
export const demoInput = z.object({ context: z.string().trim().min(5).max(800) });
export async function publicOracle(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return Response.json({error:"Solicitud no permitida."},{status:403});
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({error:"Contenido inválido."},{status:415});
  const reader=request.body?.getReader();if(!reader)return Response.json({error:"Falta contexto."},{status:400});
  let length=0;const chunks:Uint8Array[]=[];
  while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>4096){await reader.cancel();return Response.json({error:"Contexto demasiado largo."},{status:413});}chunks.push(part.value);}
  const buffer=new Uint8Array(length);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
  let input:z.infer<typeof demoInput>;try{input=demoInput.parse(JSON.parse(new TextDecoder().decode(buffer)));}catch{return Response.json({error:"Escribe entre 5 y 800 caracteres."},{status:400});}
  const key=process.env.LOVABLE_API_KEY;if(!key)return Response.json({error:"Demo no disponible ahora."},{status:503});
  const sign=(value:string)=>createHmac("sha256",key).update(`koa-demo:${value}`).digest("hex");
  const cookie=request.headers.get("cookie")?.split(";").map(c=>c.trim()).find(c=>c.startsWith("koa-demo="))?.slice(9)??"";
  const [id,signature]=cookie.split(".");let visitor:string=randomUUID();
  if(id&&signature&&/^[0-9a-f-]{36}$/.test(id)&&/^[0-9a-f]{64}$/.test(signature)&&timingSafeEqual(Buffer.from(signature),Buffer.from(sign(id))))visitor=id;
  const headers=new Headers({"cache-control":"no-store","set-cookie":`koa-demo=${visitor}.${sign(visitor)}; HttpOnly; SameSite=Strict; Path=/api/public/oracle-demo; Max-Age=86400${new URL(request.url).protocol==="https:"?"; Secure":""}`});
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const claim=await supabaseAdmin.rpc("claim_public_oracle",{p_visitor:sign(visitor)});
  if(claim.error)return Response.json({error:claim.error.message},{status:429,headers});
  try{
    const stop=new Set(["que","una","uno","unos","unas","para","con","sin","los","las","del","por","algo","quiero","libro","libros","leer","estoy","muy","pero","como","the","and","for","with","book"]);
    const words=input.context.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(/[^a-z0-9ñ]+/).filter(w=>w.length>3&&!stop.has(w)).slice(0,6);
    const queries=[words.slice(0,2).join(" "),...words.slice(0,4)].filter(Boolean);if(!queries.length)throw new Error("Contexto sin términos.");
    const pool=await catalogPool(queries);
    const seen=new Set<string>();const options=pool.filter(b=>{const k=`${b.title}|${b.author}`.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;}).slice(0,3);
    if(options.length!==3)throw new Error("No hay tres candidatos verificables ahora.");
    return Response.json({options},{headers});
  }catch(error){console.error("Public Oracle failed",error instanceof Error?`${error.name}: ${error.message}`:"error");return Response.json({error:"No pudimos reunir tres sugerencias verificadas. Conserva tu contexto e inténtalo más tarde."},{status:503,headers});}
}