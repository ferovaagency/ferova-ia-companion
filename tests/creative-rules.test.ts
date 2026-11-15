import { describe, it, expect } from "vitest";
import { IMAGE_LIMIT, validateImage, ocrGridSchema } from "../src/lib/creative-input";
import { matchesCell, bingoDraftSchema, newDraft } from "../src/lib/bingo";
describe("creative import rules",()=>{
  it("rejects spoofed image MIME",()=>expect(()=>validateImage("data:image/png;base64,"+btoa("not an image"))).toThrow("tipo"));
  it("rejects images larger than 5 MB",()=>expect(()=>validateImage("data:image/jpeg;base64,"+btoa(String.fromCharCode(255,216,255)+"x".repeat(IMAGE_LIMIT)))).toThrow("5 MB"));
  it("rejects arbitrary URLs and SVG",()=>{expect(()=>validateImage("https://example.com/image.png")).toThrow();expect(()=>validateImage("data:image/svg+xml;base64,PHN2Zz4=")).toThrow();});
  it("requires exactly 9/16/25 OCR labels",()=>{for(const size of [3,4,5] as const){const grid={title:"QA",purpose:"",size,labels:Array(size*size).fill("[ilegible]"),source_credit:"QA source"};expect(ocrGridSchema.parse(grid).labels.length).toBe(size*size);expect(()=>ocrGridSchema.parse({...grid,labels:grid.labels.slice(1)})).toThrow();}});
  it("preserves source credit in native drafts",()=>expect(bingoDraftSchema.parse({...newDraft(),source_credit:"Original creator"}).source_credit).toBe("Original creator"));
  it("does not invent catalog page eligibility",()=>{expect(matchesCell({author:"A",genre:"",pages:0},{kind:"book",label:"Short",condition:"max_pages",value:"250"})).toBe(false);expect(matchesCell({author:"A",genre:"",pages:250},{kind:"book",label:"Short",condition:"max_pages",value:"250"})).toBe(true);expect(matchesCell({author:"A",genre:"",pages:251},{kind:"book",label:"Short",condition:"max_pages",value:"250"})).toBe(false);});
});