import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("release notes rendering", () => {
  it("renders headings, lists, bold, code and https links", () => {
    const html = renderMarkdown("### Added\n\n- **Accounts** for `owners`\n  wrapped line\n- [Docs](https://x.test/a)\n\nA paragraph.");
    expect(html).toContain("<h4>Added</h4>");
    expect(html).toContain("<li><strong>Accounts</strong> for <code>owners</code> wrapped line</li>");
    expect(html).toContain('<a href="https://x.test/a" target="_blank" rel="noreferrer">Docs</a>');
    expect(html).toContain("<p>A paragraph.</p>");
  });

  it("never lets HTML or other link schemes through", () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)> [x](javascript:alert(1)) <script>bad()</script> "quotes"');
    expect(html).not.toMatch(/<img|<script|href="javascript/);
    expect(html).toContain("&lt;img");
  });
});
