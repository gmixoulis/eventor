/** The JSON string printed as a place's checkpoint QR code. */
export function encodeCheckpoint(placeId: string): string {
  return JSON.stringify({ v: 1, kind: 'checkpoint', placeId });
}

/** Scanned data is untrusted: accept only the exact shape encodeCheckpoint produces, for a known place. */
export function parseCheckpoint(data: string, placeIds: readonly string[]): string | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort().join();
  const { v, kind, placeId } = value as Record<string, unknown>;
  if (keys !== 'kind,placeId,v' || v !== 1 || kind !== 'checkpoint') return null;
  return typeof placeId === 'string' && placeIds.includes(placeId) ? placeId : null;
}
