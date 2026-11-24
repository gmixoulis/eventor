import type { Lead, Profile } from '@/store';

type LeadCode = Omit<Lead, 'scannedAt'>;

/** The JSON string encoded in "My Code". */
export function encodeLead(profile: Profile): string {
  return JSON.stringify({
    v: 1,
    id: profile.id,
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    title: profile.title,
    company: profile.company,
  });
}

/** Scanned data is untrusted: accept only the exact shape encodeLead produces. */
export function parseLead(data: string): LeadCode | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { v, id, name, title, company } = value as Record<string, unknown>;
  if (v !== 1) return null;
  if (typeof id !== 'string' || !id || typeof name !== 'string' || !name) return null;
  if (typeof title !== 'string' || typeof company !== 'string') return null;
  return { id, name, title, company };
}
