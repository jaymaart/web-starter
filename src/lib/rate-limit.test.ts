import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

// Exercise the in-memory fallback path deterministically (no Redis).
describe("rateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it("allows up to the limit, then blocks", async () => {
    const key = "test:rate-limit"; // unique key avoids cross-test bleed
    const first = await rateLimit(key, 2, 60);
    const second = await rateLimit(key, 2, 60);
    const third = await rateLimit(key, 2, 60);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });
});
