// Tiny Markdown → HTML converter for the interpretation text that goes into
// the PDF. Deliberately small: headings, bold/italic/code, lists, GFM tables,
// fenced code, blockquotes, hr, paragraphs — everything a reading uses.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return out;
}

const isTableSep = (l: string) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l) && l.includes("-");

function splitRow(l: string): string[] {
  let s = l.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (/^\s*```/.test(line)) {
      const lang = line.trim().replace(/^```/, "").trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(`<pre class="code ${esc(lang)}">${esc(body.join("\n"))}</pre>`);
      continue;
    }

    if (!line.trim()) { i++; continue; }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = Math.min(h[1].length + 1, 6); // demote: page already has an h1
      out.push(`<h${lvl} class="md">${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    // hr
    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) { out.push('<hr class="md">'); i++; continue; }

    // blockquote
    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote class="md">${mdToHtml(body.join("\n"))}</blockquote>`);
      continue;
    }

    // table
    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(splitRow(lines[i++]));
      out.push(
        `<table class="md"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
      );
      continue;
    }

    // lists
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        const text: string[] = [lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, "")];
        i++;
        // continuation lines (indented)
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          text.push(lines[i].trim());
          i++;
        }
        items.push(`<li>${inline(text.join(" "))}</li>`);
      }
      out.push(`<${ordered ? "ol" : "ul"} class="md">${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }

    // paragraph
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^\s*(#{1,6}\s|```|>|([-*+]|\d+\.)\s)/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      para.push(lines[i++]);
    }
    if (para.length) out.push(`<p class="md">${inline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}
