/** @jest-environment ./src/assistant/server/test-environment.cjs */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { DEEPSEEK_PRICES } from '@/assistant/server/deepseek';
import { GEMINI_PRICES } from '@/assistant/server/gemini';
import { cacheAddress, handleAsk } from '@/assistant/server/handle-ask';
import { ipBucket, reservedCost } from '@/assistant/server/http';
import { memoryStores } from '@/assistant/server/memory';
import { LIMITS, type AskDeps } from '@/assistant/server/types';

const time = '2026-05-28T11:25:00.000Z';
const body = { question: 'Where is the venue?', eventTime: time, installId: 'install_123' };
function request(input: unknown = body, headers = {}): Request {
  return new Request('https://example.test/api/ask', { method: 'POST', body: JSON.stringify(input), headers });
}
function deps(): AskDeps {
  return {
    ...memoryStores(() => Date.parse(time), LIMITS), now: () => Date.parse(time),
    summaries: { 'sponsor:sponsor-skyline': 'Sponsor 1 flies attendees to the festival.' },
    generate: jest.fn<AskDeps['generate']>(async () => ({ text: 'Startup 1 connects farmers and restaurants.', costUsd: 0.0009 })),
    prices: DEEPSEEK_PRICES, maxInflight: 50, dailyCapUsd: 5, cacheVersion: 'test',
  };
}
afterEach(() => { jest.restoreAllMocks(); });

describe('trust boundary', () => {
  it.each([
    null, [], {}, { ...body, question: 2 }, { ...body, question: '  ' }, { ...body, question: 'a'.repeat(301) },
    { ...body, eventTime: 'yesterday' }, { ...body, eventTime: '2026-99-99T11:00:00Z' }, { ...body, eventTime: 2 },
    { ...body, installId: 'short' }, { ...body, installId: 'a'.repeat(65) }, { ...body, installId: 'invalid id' },
    { ...body, installId: 12345678 },
  ])('rejects invalid input %j', async (input) => {
    const response = await handleAsk(request(input), deps());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });
  it('accepts trimmed bounds, unknown fields and ISO times outside the event', async () => {
    for (const installId of ['a'.repeat(8), 'a'.repeat(64)]) {
      const response = await handleAsk(request({ ...body, question: ' Where is the venue? ', installId, extra: 'ignored', eventTime: '2027-05-28T14:00:00+03:00' }), deps());
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect((await handleAsk(request({ ...body, question: 'a'.repeat(300) }), deps())).status).toBe(200);
    expect((await handleAsk(request({ ...body, eventTime: '2026-05-28' }), deps())).status).toBe(200);
  });
  it('rejects malformed JSON and oversize bytes with or without content-length', async () => {
    for (const text of ['{', JSON.stringify({ ...body, padding: 'x'.repeat(4096) }), JSON.stringify({ ...body, padding: 'é'.repeat(2100) })]) {
      expect((await handleAsk(new Request('https://example.test', { method: 'POST', body: text }), deps())).status).toBe(400);
    }
    expect((await handleAsk(request(body, { 'content-length': '4097' }), deps())).status).toBe(400);
  });
  it('rejects other methods with Allow', async () => {
    const response = await handleAsk(new Request('https://example.test'), deps());
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });
});

describe('rate limits', () => {
  it.each([0, 1, 2])('returns Retry-After for limit %s', async (index) => {
    const services = deps();
    services.rateLimit = jest.fn(async () => [0, 1, 2].map((i) => ({ success: i !== index, reset: services.now() + 2300 })));
    const response = await handleAsk(request(body, { 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'x-real-ip': '9.9.9.9' }), services);
    expect(services.rateLimit).toHaveBeenCalledWith(body.installId, '9.9.9.9');
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('3');
    expect(await response.json()).toEqual({ error: 'rate_limited', retryAfterSec: 3 });
  });
  it('ignores a client-written first x-forwarded-for entry and uses the proxy hop', async () => {
    const services = deps();
    services.rateLimit = jest.fn(async () => []);
    await handleAsk(request(body, { 'x-forwarded-for': '6.6.6.6, 5.6.7.8' }), services);
    expect(services.rateLimit).toHaveBeenCalledWith(body.installId, '5.6.7.8');
    await handleAsk(request(body, { 'x-forwarded-for': '6.6.6.6', 'x-vercel-forwarded-for': '7.7.7.7' }), services);
    expect(services.rateLimit).toHaveBeenLastCalledWith(body.installId, '7.7.7.7');
  });
  it('uses x-real-ip when forwarded-for is absent', async () => {
    const services = deps();
    services.rateLimit = jest.fn(async () => []);
    await handleAsk(request(body, { 'x-real-ip': '9.9.9.9' }), services);
    expect(services.rateLimit).toHaveBeenCalledWith(body.installId, '9.9.9.9');
  });
  it('keys IPv6 clients by their /64 for both per-IP limits', async () => {
    const services = deps();
    services.rateLimit = jest.fn(async () => []);
    services.modelLimit = jest.fn(async () => true);
    await handleAsk(request({ ...body, question: 'What is Startup 1 building?' }, { 'x-forwarded-for': '2001:db8:1:2:aaaa::1' }), services);
    expect(services.rateLimit).toHaveBeenCalledWith(body.installId, '2001:db8:1:2::/64');
    expect(services.modelLimit).toHaveBeenCalledWith('2001:db8:1:2::/64');
  });
  it.each([
    ['1.2.3.4', '1.2.3.4'], ['unknown', 'unknown'], ['::ffff:1.2.3.4', '1.2.3.4'],
    ['2001:DB8:1:2:3:4:5:6', '2001:db8:1:2::/64'], ['2001:db8:1:2:ffff::1', '2001:db8:1:2::/64'],
    ['2001:db8::1', '2001:db8:0:0::/64'], ['fe80::1%eth0', 'fe80:0:0:0::/64'], ['1:2:3:4:5:6:7:8::9', '1:2:3:4::/64'],
  ])('buckets %s as %s', (ip, bucket) => expect(ipBucket(ip)).toBe(bucket));
  it('enforces actual local install-minute, install-hour and IP-minute quotas', async () => {
    let now = 0;
    const stores = memoryStores(() => now, LIMITS);
    for (let minute = 0; minute < 6; minute++) {
      for (let i = 0; i < 10; i++) expect((await stores.rateLimit('install', `ip-${minute}`))[0].success).toBe(true);
      expect((await stores.rateLimit('install', `ip-${minute}`))[0].success).toBe(false);
      now += 60001;
    }
    expect((await stores.rateLimit('install', 'fresh-ip'))[1].success).toBe(false);
    for (let i = 0; i < 30; i++) expect((await stores.rateLimit(`user-${i}`, 'same-ip'))[2].success).toBe(true);
    expect((await stores.rateLimit('new-user', 'same-ip'))[2].success).toBe(false);
  });
});

describe('answer cache and core integration', () => {
  it('normalizes accents, case and spaces, keeps punctuation, and buckets clamped time', async () => {
    const address = (q: string, iso = time) => cacheAddress(q, new Date(iso), 'local');
    expect(await address(' Où  IS the venue? ')).toEqual(await address('ou is the venue?'));
    expect((await address('venue?')).key).not.toBe((await address('venue')).key);
    expect((await address("what's next")).ttl).toBe(300);
    expect((await address("what's next", '2026-05-28T11:29:59Z')).key).toBe((await address("what's next")).key);
    expect((await address("what's next", '2026-05-28T11:30:00Z')).key).not.toBe((await address("what's next")).key);
    expect(await address("what's next", '2027-01-01T00:00:00Z')).toEqual(await address("what's next", '2028-01-01T00:00:00Z'));
    expect((await address('summarize today')).ttl).toBe(300);
    expect((await address('Sponsor 1 website')).ttl).toBe(86400);
  });
  it('starts a fresh cache for every deployment', async () => {
    const at = new Date(time);
    expect((await cacheAddress('Sponsor 1 website', at, 'dpl_a')).key).not.toBe((await cacheAddress('Sponsor 1 website', at, 'dpl_b')).key);
    expect((await cacheAddress('Sponsor 1 website', at, 'dpl_a')).key).toContain(':dpl_a:');
  });
  it('runs the gate before the cache, so a refused question never gets its admitted twin\'s answer', async () => {
    const services = deps();
    const admitted = await handleAsk(request({ ...body, question: 'is tesla at the festival' }), services);
    expect(await admitted.json()).toMatchObject({ kind: 'lookup' });
    const get = jest.spyOn(services.cache, 'get');
    const refused = await handleAsk(request({ ...body, question: 'Is Tesla at the festival' }), services);
    expect(await refused.json()).toMatchObject({ kind: 'refused', sources: [] });
    expect(get).not.toHaveBeenCalled();
  });
  it('caches a generated miss then serves a shared hit', async () => {
    const services = deps();
    const input = { ...body, question: 'What is Startup 1 building?' };
    const first = await handleAsk(request(input), services);
    const second = await handleAsk(request({ ...input, installId: 'different-user' }), services);
    const answer = await first.json();
    expect(answer.suggestions.length).toBeGreaterThan(0);
    expect(await second.json()).toEqual(answer);
    expect(services.generate).toHaveBeenCalledTimes(1);
  });
  it('adds suggestions after reading an older cached response without calling the model', async () => {
    const services = deps();
    services.cache.get = jest.fn(async () => ({
      answer: 'Opening is at noon.', kind: 'lookup' as const,
      sources: [{ type: 'session' as const, id: 'opening', title: 'Opening' }],
    }));
    const response = await handleAsk(request(), services);
    expect(await response.json()).toMatchObject({ suggestions: ['Who is speaking at Opening?', 'Where is Opening?'] });
    expect(services.generate).not.toHaveBeenCalled();
  });
  it('uses separate cache entries across five-minute boundaries', async () => {
    const services = deps();
    const get = jest.spyOn(services.cache, 'get');
    for (const eventTime of [time, '2026-05-28T11:29:59Z', '2026-05-28T11:30:00Z']) {
      expect((await handleAsk(request({ ...body, question: "What's on now?", eventTime }), services)).status).toBe(200);
    }
    expect(get.mock.calls[0][0]).toBe(get.mock.calls[1][0]);
    expect(get.mock.calls[0][0]).not.toBe(get.mock.calls[2][0]);
  });
  it.each([
    { question: 'Where is the venue?', kind: 'lookup', generated: false },
    { question: 'Summarize Sponsor 1', kind: 'summary', generated: false },
    { question: 'What is Startup 1 building?', kind: 'generated', generated: true },
    { question: 'Summarize Startup 2', kind: 'fallback', generated: false },
    { question: 'Tell me about Coca-Cola', kind: 'refused', generated: false },
  ])('answers $kind through the real core', async ({ question, kind, generated }) => {
    const services = deps();
    const set = jest.spyOn(services.cache, 'set');
    const response = await handleAsk(request({ ...body, question }), services);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind, answer: expect.any(String), sources: expect.any(Array) });
    expect(services.generate).toHaveBeenCalledTimes(generated ? 1 : 0);
    expect(set).toHaveBeenCalledTimes(['refused', 'fallback'].includes(kind) ? 0 : 1);
  });
});

describe('global caps and failures', () => {
  it.each(['inflight', 'daily'] as const)('stops generation at the %s cap', async (cap) => {
    const services = deps();
    if (cap === 'inflight') services.maxInflight = 0;
    else services.dailyCapUsd = 0;
    const release = jest.spyOn(services.inflight, 'release');
    const response = await handleAsk(request({ ...body, question: 'What is Startup 1 building?' }), services);
    expect(await response.json()).toMatchObject({ kind: 'fallback' });
    expect(services.generate).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(cap === 'daily' ? 1 : 0);
  });
  it('settles actual cost on the UTC request date and releases the slot', async () => {
    const services = deps();
    const reserve = jest.spyOn(services.spend, 'reserve');
    const settle = jest.spyOn(services.spend, 'settle');
    const release = jest.spyOn(services.inflight, 'release');
    await handleAsk(request({ ...body, question: 'What is Startup 1 building?' }), services);
    expect(reserve).toHaveBeenCalledWith('2026-05-28', expect.any(Number), 5);
    expect(settle).toHaveBeenCalledWith('2026-05-28', reserve.mock.calls[0][1], 0.0009);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('stops model calls at the per-IP model limit and answers from the facts', async () => {
    const services = deps();
    services.modelLimit = jest.fn(async () => false);
    const acquire = jest.spyOn(services.inflight, 'acquire');
    const response = await handleAsk(request({ ...body, question: 'What is Startup 1 building?' }), services);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: 'fallback', answer: expect.stringContaining('Startup 1') });
    expect(acquire).not.toHaveBeenCalled();
    expect(services.generate).not.toHaveBeenCalled();
  });
  it('settles a call DeepSeek did not bill to zero', async () => {
    const services = deps();
    services.generate = jest.fn(async () => ({ text: null, costUsd: 0 }));
    const reserve = jest.spyOn(services.spend, 'reserve');
    const settle = jest.spyOn(services.spend, 'settle');
    expect(await (await handleAsk(request({ ...body, question: 'What is Startup 1 building?' }), services)).json()).toMatchObject({ kind: 'fallback' });
    expect(settle).toHaveBeenCalledWith('2026-05-28', reserve.mock.calls[0][1], 0);
  });
  it('keeps uncertain spend and does not cache model failures', async () => {
    const services = deps();
    services.generate = jest.fn(async () => ({ text: null, costUsd: null }));
    const settle = jest.spyOn(services.spend, 'settle');
    const set = jest.spyOn(services.cache, 'set');
    const release = jest.spyOn(services.inflight, 'release');
    expect(await (await handleAsk(request({ ...body, question: 'What is Startup 1 building?' }), services)).json()).toMatchObject({ kind: 'fallback' });
    expect(settle).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('still answers 503 for an unexpected failure without logging user data', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = deps();
    services.summaries = new Proxy({}, { get: () => { throw new TypeError(body.question); } });
    const response = await handleAsk(request({ ...body, question: 'Summarize Sponsor 1' }), services);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'unavailable' });
    expect(log.mock.calls).toEqual([['Assistant request failed', 'TypeError']]);
  });
});

describe('Redis outage', () => {
  const model = { ...body, question: 'What is Startup 1 building?' };
  // The message quotes the question, so the exact log assertions prove it is never logged.
  const fail = async (): Promise<never> => { throw new TypeError(model.question); };

  it('answers lookups, summaries and refusals but never the model when the rate limiter throws', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = deps();
    services.rateLimit = fail;
    const modelLimit = jest.spyOn(services, 'modelLimit');
    const get = jest.spyOn(services.cache, 'get');
    const set = jest.spyOn(services.cache, 'set');
    for (const [question, kind] of [
      ['Where is the venue?', 'lookup'], ['Summarize Sponsor 1', 'summary'], ['Tell me about Coca-Cola', 'refused'], [model.question, 'fallback'],
    ]) {
      const response = await handleAsk(request({ ...body, question }), services);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ kind, answer: expect.any(String) });
    }
    expect(services.generate).not.toHaveBeenCalled();
    expect(modelLimit).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(log.mock.calls).toEqual(Array(4).fill(['Assistant rate limit failed', 'TypeError']));
  });
  it.each([
    ['get', 'Assistant cache read failed'], ['set', 'Assistant cache write failed'],
  ] as const)('still answers when the cache %s throws', async (method, context) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = deps();
    services.cache[method] = fail;
    const response = await handleAsk(request(model), services);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: 'generated' });
    expect(log.mock.calls).toEqual([[context, 'TypeError']]);
  });
  it.each([
    ['modelLimit', 'Assistant model limit failed', 0],
    ['acquire', 'Assistant slot acquire failed', 0],
    ['reserve', 'Assistant spend reserve failed', 1],
  ] as const)('answers from the facts without the model when %s throws', async (step, context, releases) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = deps();
    if (step === 'modelLimit') services.modelLimit = fail;
    else if (step === 'acquire') services.inflight.acquire = fail;
    else services.spend.reserve = fail;
    const release = jest.spyOn(services.inflight, 'release');
    const response = await handleAsk(request(model), services);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: 'fallback', answer: expect.stringContaining('Startup 1') });
    expect(services.generate).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(releases);
    expect(log.mock.calls).toEqual([[context, 'TypeError']]);
  });
  it('keeps the reservation and releases the slot when the model call throws', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = deps();
    services.generate = fail;
    const settle = jest.spyOn(services.spend, 'settle');
    const release = jest.spyOn(services.inflight, 'release');
    expect(await (await handleAsk(request(model), services)).json()).toMatchObject({ kind: 'fallback' });
    expect(settle).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
    expect(log.mock.calls).toEqual([['Assistant model call failed', 'TypeError']]);
  });
  it.each([
    ['settle', 'Assistant spend settle failed'], ['release', 'Assistant slot release failed'],
  ] as const)('returns the generated answer when %s throws after a good call', async (step, context) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = deps();
    if (step === 'settle') services.spend.settle = fail;
    else services.inflight.release = fail;
    const release = jest.spyOn(services.inflight, 'release');
    const response = await handleAsk(request(model), services);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: 'generated', answer: expect.stringContaining('Startup 1 connects') });
    expect(release).toHaveBeenCalledTimes(1);
    expect(log.mock.calls).toEqual([[context, 'TypeError']]);
  });
});

describe('spend reservation', () => {
  const prompt = { system: 'Use facts only.', user: 'Startup 1 facts', allowedUrls: [] };
  const bytes = new TextEncoder().encode(prompt.system + prompt.user).byteLength + 1024;
  it.each([
    ['DeepSeek', DEEPSEEK_PRICES, 0.3, 1.2],
    ['Gemini', GEMINI_PRICES, 0.25, 1.5],
  ] as const)('reserves at the %s prices only, never the dearer of both', (_provider, prices, input, output) => {
    expect(reservedCost(prompt, prices)).toBeCloseTo((bytes * input + 350 * output) / 1e6, 12);
  });
});
