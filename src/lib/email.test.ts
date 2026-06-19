import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/email";

// Pure-logic unit test (§14). escapeHtml guards against stored XSS in emails (§6).
describe("escapeHtml", () => {
  it("escapes all HTML-significant characters", () => {
    expect(escapeHtml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&#39;");
  });

  it("leaves no raw angle brackets that could open a tag", () => {
    const out = escapeHtml('<img src=x onerror="alert(1)">');
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
  });

  it("is a no-op on plain text", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});
