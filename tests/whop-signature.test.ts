import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWhopSignature } from "../src/lib/whop.server";

const body = JSON.stringify({ type: "membership.updated", data: { id: "mem_123" } });
const now = 1_800_000_000_000;
const ts = String(now / 1000);
const sign = (key: Buffer, id = "msg_1", t = ts, raw = body) => createHmac("sha256", key).update(`${id}.${t}.${raw}`).digest("base64");
const headers = (sig: string, t = ts) => new Headers({ "webhook-id": "msg_1", "webhook-timestamp": t, "webhook-signature": `v1,${sig}` });

describe("Whop webhook signature", () => {
  const secret = "ws_" + Buffer.from("synthetic-test-secret").toString("base64");

  it("accepts a signature made with the raw secret or the base64-decoded secret", () => {
    expect(verifyWhopSignature(body, headers(sign(Buffer.from(secret))), secret, now)).toBe(true);
    expect(verifyWhopSignature(body, headers(sign(Buffer.from(secret.slice(3), "base64"))), secret, now)).toBe(true);
  });
  it("rejects a tampered body, a wrong secret or a missing header", () => {
    const sig = sign(Buffer.from(secret));
    expect(verifyWhopSignature(body.replace("mem_123", "mem_999"), headers(sig), secret, now)).toBe(false);
    expect(verifyWhopSignature(body, headers(sign(Buffer.from("ws_otro"))), secret, now)).toBe(false);
    expect(verifyWhopSignature(body, new Headers({ "webhook-id": "msg_1" }), secret, now)).toBe(false);
  });
  it("rejects events older or newer than five minutes", () => {
    const old = String(now / 1000 - 301);
    expect(verifyWhopSignature(body, headers(sign(Buffer.from(secret), "msg_1", old), old), secret, now)).toBe(false);
  });
  it("accepts when one of several space-separated signatures matches", () => {
    const h = new Headers({ "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": `v1,AAAA v1,${sign(Buffer.from(secret))}` });
    expect(verifyWhopSignature(body, h, secret, now)).toBe(true);
  });
});
