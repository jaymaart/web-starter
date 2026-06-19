import { describe, it, expect } from "vitest";
import { isSameOrigin } from "@/lib/security";

function reqWithOrigin(origin?: string): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers,
  });
}

// Origin allowlist for mutation endpoints (§6).
describe("isSameOrigin", () => {
  it("allows a request from an allowlisted origin", () => {
    expect(isSameOrigin(reqWithOrigin("http://localhost:3000"))).toBe(true);
  });

  it("rejects a request from a foreign origin", () => {
    expect(isSameOrigin(reqWithOrigin("https://evil.example.com"))).toBe(false);
  });

  it("rejects a request with no Origin header", () => {
    expect(isSameOrigin(reqWithOrigin())).toBe(false);
  });
});
