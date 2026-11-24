import { describe, expect, it } from '@jest/globals';

import { parseLead } from '@/components/meetings/lead';

describe('parseLead', () => {
  it('accepts a festival code', () => {
    const data = JSON.stringify({ v: 1, id: 'p1', name: 'Ana Lee', title: 'CEO', company: 'Acme' });
    expect(parseLead(data)).toEqual({ id: 'p1', name: 'Ana Lee', title: 'CEO', company: 'Acme' });
  });

  it('rejects anything else', () => {
    expect(parseLead('https://example.com')).toBeNull();
    expect(parseLead('null')).toBeNull();
    expect(parseLead(JSON.stringify({ v: 2, id: 'p1', name: 'A', title: '', company: '' }))).toBeNull();
    expect(parseLead(JSON.stringify({ v: 1, id: '', name: 'A', title: '', company: '' }))).toBeNull();
    expect(parseLead(JSON.stringify({ v: 1, id: 'p1', name: 'A', title: 3, company: '' }))).toBeNull();
  });
});
