import { describe, expect, it } from "vitest";
import { cleanAuthUrl, readAuthReturn } from "../src/lib/auth-return";

const base = "https://koa.test/auth/callback";

describe("OAuth return parsing", () => {
  it("reads tokens from the hash even without expires_in/token_type", () => {
    const r = readAuthReturn(`${base}#access_token=aaa&refresh_token=rrr&state=s1`);
    expect(r).toMatchObject({ accessToken: "aaa", refreshToken: "rrr", error: undefined });
    expect(r.keys).toEqual(["access_token", "refresh_token", "state"]);
  });

  it("reads tokens and codes from the query, hash wins on conflicts", () => {
    expect(
      readAuthReturn(`${base}?access_token=q&refresh_token=q2#access_token=h`).accessToken,
    ).toBe("h");
    expect(readAuthReturn(`${base}?code=c123`).code).toBe("c123");
  });

  it("surfaces provider errors, preferring the description", () => {
    expect(
      readAuthReturn(`${base}?error=access_denied&error_description=Acceso+cancelado`).error,
    ).toBe("Acceso cancelado");
    expect(readAuthReturn(`${base}#error=server_error`).error).toBe("server_error");
  });

  it("reports no data on a bare return", () => {
    expect(readAuthReturn(base)).toEqual({
      keys: [],
      accessToken: undefined,
      refreshToken: undefined,
      code: undefined,
      error: undefined,
    });
  });

  it("strips every token and OAuth parameter but keeps unrelated ones", () => {
    expect(cleanAuthUrl(`${base}?code=c&next=lists#access_token=a&refresh_token=r`)).toBe(
      "/auth/callback?next=lists",
    );
    expect(cleanAuthUrl(`${base}?error=x&error_description=y&state=s`)).toBe("/auth/callback");
  });
});
