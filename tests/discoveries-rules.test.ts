import { describe, expect, it } from "vitest";
import { adventUnlocked, duplicateBook, feelingSchema, localCalendarDate, uniqueDiscoveries } from "../src/lib/reader-discoveries";
describe("discovery rules", () => {
  it("normalizes ISBN10 and ISBN13 for the same book", () => {
    expect(duplicateBook({title:"Edition A",author:"A",isbn:"0-306-40615-2"},{title:"Edition B",author:"B",isbn:"9780306406157"})).toBe(true);
  });
  it("excludes normalized shelf identities and deduplicates windows", () => {
    expect(uniqueDiscoveries([{title:" NEW! ",author:"Writer"},{title:"new",author:"writer"},{title:"owned",author:"a"}],[{title:"Owned",author:"A"}])).toEqual([{title:" NEW! ",author:"Writer"}]);
  });
  it("uses the reader local day at the December boundary", () => {
    const now=new Date("2026-12-01T00:30:00Z");
    expect(localCalendarDate("America/Bogota",now)).toEqual({year:2026,month:11,day:30});
    expect(adventUnlocked(2026,1,"America/Bogota",now)).toBe(false);
    expect(adventUnlocked(2026,1,"UTC",now)).toBe(true);
  });
  it("allows catch-up through December 31 without unlocking next year", () => {
    expect(adventUnlocked(2026,24,"UTC",new Date("2026-12-31T12:00:00Z"))).toBe(true);
    expect(adventUnlocked(2026,24,"UTC",new Date("2027-01-01T12:00:00Z"))).toBe(false);
  });
  it("optional intensities accept zero to five and reject six", () => {
    const signals={tears:5,immersion:0,tags:["hope"],tier:"S",tier_rank:1};
    expect(feelingSchema.safeParse(signals).success).toBe(true);
    expect(feelingSchema.safeParse({...signals,tears:6}).success).toBe(false);
  });
});