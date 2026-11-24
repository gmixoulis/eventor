import { providedUrl, URL_PATTERN } from '@/assistant/output-filter';

export type RichSpan = { text: string; bold: boolean; href?: string };
export type RichBlock = { kind: 'paragraph' | 'bullet'; spans: RichSpan[] };

function inline(text: string, allowed: ReadonlySet<string>): RichSpan[] {
  const runs: { start: number; end: number; bold: boolean }[] = [];
  let plain = '';
  let cursor = 0;
  const add = (value: string, bold: boolean) => {
    const start = plain.length;
    plain += value;
    runs.push({ start, end: plain.length, bold });
  };
  for (const match of text.matchAll(/\*\*([^*\n]+)\*\*/g)) {
    add(text.slice(cursor, match.index), false);
    add(match[1], true);
    cursor = match.index + match[0].length;
  }
  add(text.slice(cursor), false);

  const spans: RichSpan[] = [];
  const append = (start: number, end: number, href?: string) => {
    for (const run of runs) {
      const from = Math.max(start, run.start);
      const to = Math.min(end, run.end);
      if (from < to) spans.push({ text: plain.slice(from, to), bold: run.bold, ...(href ? { href } : {}) });
    }
  };
  cursor = 0;
  // Check whole URL candidates after bold markers are removed, so styling cannot hide an unsafe suffix.
  for (const match of plain.matchAll(URL_PATTERN)) {
    const url = providedUrl(match[0], allowed);
    append(cursor, match.index);
    if (!url || !/^https?:\/\//i.test(url) || /[\p{L}\d+.:/@-]$/u.test(plain.slice(0, match.index))) {
      cursor = match.index + match[0].length;
      continue;
    }
    append(match.index, match.index + url.length, url);
    cursor = match.index + url.length;
  }
  append(cursor, plain.length);
  return spans;
}

/** Only paragraphs, "- " bullets, bold and exact provided HTTP(S) links have special meaning. */
export function parseRichText(text: string, allowedUrls: readonly string[]): RichBlock[] {
  const allowed = new Set(allowedUrls);
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', spans: inline(paragraph.join('\n'), allowed) });
    paragraph = [];
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim() || line.trim() === '-' || line.startsWith('- ')) {
      flush();
      if (line.startsWith('- ')) {
        const spans = inline(line.slice(2).replace(/\*\*\s*\*\*/g, ''), allowed);
        if (spans.some((span) => span.text.trim())) blocks.push({ kind: 'bullet', spans });
      }
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
