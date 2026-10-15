/**
 * Release notes are Markdown from GitHub: a small renderer for what they use
 * (headings, lists, bold, inline code, links), everything else escaped. Not a
 * general Markdown parser, and it never outputs raw HTML from its input.
 */
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function inline(text: string): string {
  return escape(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, (_, label, url) => `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`);
}

export function renderMarkdown(source: string): string {
  const out: string[] = [];
  let list = false;
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) out.push("</ul>");
    list = false;
  };
  for (const raw of source.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    const heading = /^(#{2,4})\s+(.+)$/.exec(line);
    const item = /^\s*[-*]\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      closeList();
      out.push(`<h4>${inline(heading[2])}</h4>`);
    } else if (item) {
      flush();
      if (!list) out.push("<ul>");
      list = true;
      out.push(`<li>${inline(item[1])}</li>`);
    } else if (!line.trim()) {
      flush();
      closeList();
    } else if (list && /^\s{2,}\S/.test(raw)) {
      // A wrapped list item continues the previous one.
      out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ` ${inline(line.trim())}</li>`);
    } else {
      closeList();
      paragraph.push(line.trim());
    }
  }
  flush();
  closeList();
  return out.join("\n");
}
