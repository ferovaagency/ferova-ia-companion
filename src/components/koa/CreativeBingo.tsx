import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { importBingoImage, bingoOracle, saveBingoWish } from "@/lib/creative.functions";
import { deviceImage } from "@/lib/image-device";
import { IMAGE_LIMIT } from "@/lib/creative-input";
import type { BingoDraft } from "@/lib/bingo";
import { userError } from "@/lib/koa-data";
import { ErrorNotice } from "./UI";

export async function fileData(file: Blob): Promise<string> {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("Imagen inválida"));reader.onerror=()=>reject(new Error("No pudimos leer la imagen"));reader.readAsDataURL(file);});
}
export function BingoImageImport({review}:{review:(draft:BingoDraft)=>void}) {
  const run=useServerFn(importBingoImage);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  return <div className="my-5"><label className="block">Importar bingo desde imagen<input className="koa-field" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;setBusy(true);setError("");try{if(file.size>IMAGE_LIMIT)throw new Error("Máximo 5 MB.");const result=await run({data:{image:await deviceImage(file)}});review(result);}catch(cause){setError(userError(cause));}finally{setBusy(false);}}}/></label>{busy&&<p role="status">Leyendo la cuadrícula…</p>}{error&&<ErrorNotice>{error}</ErrorNotice>}</div>;
}
export function CellOracle({board,index,assign}:{board:string;index:number;assign:(id:string)=>void}){
  const run=useServerFn(bingoOracle);const save=useServerFn(saveBingoWish);const [options,setOptions]=useState<Awaited<ReturnType<typeof bingoOracle>>>([]);const [request,setRequest]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
  return <section className="border-t border-border py-5"><label>Mi contexto para esta casilla<input className="koa-field" maxLength={1500} value={request} onChange={e=>setRequest(e.target.value)}/></label><Button type="button" disabled={busy} className="my-3" onClick={async()=>{setBusy(true);setError("");setOptions([]);try{setOptions(await run({data:{board,index,request}}));}catch(cause){setError(userError(cause));}finally{setBusy(false);}}}>{busy?"Verificando opciones…":"Pedir tres opciones al Oráculo"}</Button>{error&&<ErrorNotice>{error}</ErrorNotice>}{options.map(o=><article key={o.id} className="border-t border-border py-3"><h3>{o.title}</h3><p className="koa-muted">{o.author}</p><Button type="button" variant="secondary" disabled={busy} className="mt-3" onClick={async()=>{if(o.bookId){assign(o.bookId);setNotice("Seleccionado; guarda la asignación abajo.");return;}setBusy(true);setError("");try{await save({data:{catalogId:o.id,title:o.title,author:o.author}});setNotice("Guardado en deseos; no registra lectura ni completa la casilla.");}catch(cause){setError(userError(cause));}finally{setBusy(false);}}}>{o.bookId?"Asignar mi libro":"Guardar en deseos"}</Button></article>)}{notice&&<p role="status">{notice}</p>}</section>;
}