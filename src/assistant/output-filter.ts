export const MAX_ANSWER_WORDS = 120;
const MAX_ANSWER_CHARS = 2400;
// A dot, including the look-alikes U+2024 (one dot leader) and U+3002 (ideographic full stop), and "[.]".
const DOT = '(?:[.\\u2024\\u3002]|\\[\\.\\])';
// Explicit URLs, bare domains with any letter ending (".com", ".рф") and bare IPv4 addresses,
// so invented links cannot survive as plain text.
export const URL_PATTERN = new RegExp(
  `(?:[a-z][a-z\\d+.-]*:\\/\\/|\\/\\/|www${DOT})[^\\s<>"'\`\\[\\]]+` +
  `|(?<![\\p{L}\\d])(?:[\\p{L}\\d](?:[\\p{L}\\d-]*[\\p{L}\\d])?${DOT})+\\p{L}{2,}(?::\\d+)?(?:\\/[^\\s<>"'\`\\[\\]]*)?` +
  `|(?<![\\p{L}\\d])\\d{1,3}(?:${DOT}\\d{1,3}){3}\\b(?::\\d+)?(?:\\/[^\\s<>"'\`\\[\\]]*)?`,
  'giu');

/** Exact provided URL, allowing the same trailing sentence punctuation as the output filter. */
export function providedUrl(candidate: string, allowed: ReadonlySet<string>): string | null {
  if (allowed.has(candidate)) return candidate;
  const url = candidate.replace(/[.,;!()*]+$/, '');
  return allowed.has(url) ? url : null;
}

/** Validate visible text without letting bold markers split a domain. Keep unrelated styling. */
function removeHiddenUrls(text: string, allowed: ReadonlySet<string>): string {
  const hidden = [...text.replace(/\*\*/g, '').matchAll(URL_PATTERN)]
    .filter((match) => !providedUrl(match[0], allowed));
  if (!hidden.length) return text;
  let offset = 0;
  let index = 0;
  return text.replace(/\*\*|[\s\S]/g, (part) => {
    if (part === '**') return part;
    while (hidden[index] && offset >= hidden[index].index + hidden[index][0].length) index += 1;
    const remove = hidden[index] && offset >= hidden[index].index;
    offset += 1;
    return remove ? '' : part;
  }).replace(/\*\*\s*\*\*/g, '');
}

export function filterOutput(text: string, allowedUrls: string[]): string {
  const allowed = new Set(allowedUrls);
  let clean = text
    // Full-width letters and dots become plain ones, and invisible characters cannot split a domain.
    .normalize('NFKC')
    .replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/!\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])?/g, '')
    .replace(/\b(?:javascript|data|mailto|file|tel):[^\s<>"'`]+/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(URL_PATTERN, (candidate) => providedUrl(candidate, allowed) ? candidate : '')
    .replace(/\[([^\]\n]*)\]\(([^)\n]*)\)/g, (_, label: string, url: string) =>
      url.trim() ? `${label}: ${url}` : label)
    // Removing a URL can consume its closing parenthesis too.
    .replace(/\[([^\]\n]*)\]\([ \t]*(?:\)|(?=\s|$))/g, '$1')
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')
    .replace(/[ \t]+#+[ \t]*$/gm, '')
    .replace(/[^\S\r\n]*\u2014[^\S\r\n]*/g, ', ')
    .replace(/\[\s*\]|\(\s*\)/g, '')
    // Cleanup must not join a provided URL to an unprovided path or suffix.
    .replace(URL_PATTERN, (candidate) => providedUrl(candidate, allowed) ? candidate : '');
  clean = removeHiddenUrls(clean, allowed)
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/ *\r?\n */g, '\n')
    .replace(/^- *(?:\*\* *)*$/gm, '')
    .trim();
  // Truncate on word boundaries so a retained URL is never changed into a new URL.
  let words = 0;
  let end = 0;
  for (const word of clean.matchAll(/\S+/g)) {
    const nextEnd = word.index + word[0].length;
    if (words === MAX_ANSWER_WORDS || nextEnd > MAX_ANSWER_CHARS) break;
    end = nextEnd;
    words += 1;
  }
  return clean.slice(0, end);
}
