import { describe, it, expect, vi, afterEach } from "vitest";
import { encode } from "fast-png";
import { decodeImage } from "../src/lib/image-decode.server";
import { QueryClient } from "@tanstack/react-query";
import { clearPrivateView, revokeViews } from "../src/lib/privacy-cache";
describe("audit regression rules",()=>{
  afterEach(() => vi.unstubAllGlobals());
  it("revokes same-tab private data even when browser storage is disabled", () => {
    const client = new QueryClient();
    client.setQueryData(["koa-books"], ["private"]);
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("localStorage", { setItem() { throw new Error("Storage disabled"); } });
    expect(() => revokeViews(client)).not.toThrow();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
  it("really decodes and reencodes PNG pixels without trailing payload",()=>{const bytes=encode({width:2,height:2,channels:4,data:new Uint8Array(16).fill(180)});const source=Buffer.concat([bytes,Buffer.from("SECRET METADATA")]);const result=decodeImage(`data:image/png;base64,${source.toString("base64")}`);expect(result.width).toBe(2);expect(result.bytes.length).toBe(bytes.length);expect(Buffer.from(result.bytes).includes(Buffer.from("SECRET"))).toBe(false);});
  it("rejects signed but malformed PNG",()=>expect(()=>decodeImage("data:image/png;base64,iVBORw0KGgo=")).toThrow());
  it("rejects unsupported raw WebP rather than trusting signature",()=>expect(()=>decodeImage(`data:image/webp;base64,${Buffer.from('RIFFxxxxWEBPxxxx').toString('base64')}`)).toThrow("PNG"));
  it("clears all prior identity queries before new identity loads",()=>{const q=new QueryClient();q.setQueryData(['koa-books'],[{title:'PRIVATE OLD'}]);q.setQueryData(['koa-viewer','old'],{private:true});clearPrivateView(q);expect(q.getQueryData(['koa-books'])).toBeUndefined();expect(q.getQueryCache().getAll()).toHaveLength(0);});
});