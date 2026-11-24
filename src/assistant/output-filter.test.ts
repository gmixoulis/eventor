import { expect, it } from '@jest/globals';

import { filterOutput, MAX_ANSWER_WORDS, providedUrl } from '@/assistant/output-filter';
import { buildPrompt } from '@/assistant/prompt';

it('keeps paragraphs, list lines and bold through word truncation', () => {
  const start = 'A paragraph.\n\n- **First** item\n- Second item\n';
  const result = filterOutput(start + 'word '.repeat(150), []);
  expect(result.startsWith(start)).toBe(true);
  expect(result.match(/\S+/g)).toHaveLength(MAX_ANSWER_WORDS);
  expect(result.endsWith('word')).toBe(true);
});

it('keeps line breaks through character truncation without splitting a URL', () => {
  const start = `${'x'.repeat(1180)}\n\n${'y'.repeat(1180)}`;
  const url = `https://safe.test/${'z'.repeat(80)}`;
  expect(filterOutput(`${start}\n${url}`, [url])).toBe(start);
});

it.each([
  ['# Title\n\n## Next ##\n- **Name**', 'Title\n\nNext\n- **Name**'],
  ['Read [the website](https://evil.test).', 'Read the website'],
  ['Read [the website](https://safe.test)', 'Read the website: https://safe.test'],
  ['Title \u2014 details\nOther\u2014more', 'Title, details\nOther, more'],
  ['One  two\t three [] [ ] ()\n  Four   five', 'One two three\nFour five'],
])('cleans formatting leftovers: %s', (input, expected) => {
  expect(filterOutput(input, ['https://safe.test'])).toBe(expected);
});

it.each(['https://safe.test[]/private', 'https://safe.test( )/private'])('does not create a new URL by removing empty brackets: %s', (text) => {
  expect(filterOutput(text, ['https://safe.test'])).toBe('');
});

it.each([
  'https://safe.test.evil.test', 'https://safe.test/path', 'https://safe.test?',
  'https://safe.test#evil', 'https://safe.test@evil.test', 'evil[.]example',
  'ｅｖｉｌ．ｃｏｍ', 'evil\u200b.test', '1.2.3.4/x', 'javascript:alert(1)',
])('cleanup still strips a non-allowed URL: %s', (url) => {
  expect(filterOutput(`# Title\n\n- [Details](${url}) \u2014 next`, ['https://safe.test']))
    .toBe('Title\n\n- Details, next');
});

it('keeps the English-only prompt and requests only the supported subset', () => {
  const { system } = buildPrompt('Question', [], []);
  expect(system).toContain('Answer in English');
  expect(system).toContain('each line starting with "- "');
  expect(system).toContain('**bold** only for names and times');
  expect(system).toContain('No headings, tables');
});

it.each(['Book at **evil**.com', 'evil.c**om**', 'evil\u2024**com**'])('removes visible domains split by bold: %s', (text) => {
  expect(filterOutput(text, [])).toBe(text.startsWith('Book') ? 'Book at' : '');
});

it('keeps safe bold and links when removing a split domain from the same answer', () => {
  const url = 'https://safe.test';
  expect(filterOutput(`**Name**: Book at **evil**.com then **${url}**`, [url]))
    .toBe(`**Name**: Book at then **${url}**`);
});

it('keeps a provided URL wrapped in bold markers', () => {
  const url = 'https://allowed/x';
  expect(providedUrl(`${url}**`, new Set([url]))).toBe(url);
  expect(filterOutput(`see **${url}**`, [url])).toBe(`see **${url}**`);
});

it.each(['-', '- ', '- ** **', '- https://evil.test', '- **evil**.com'])('removes empty list markers: %s', (line) => {
  expect(filterOutput(`Before\n${line}\nAfter`, [])).toBe('Before\n\nAfter');
});
