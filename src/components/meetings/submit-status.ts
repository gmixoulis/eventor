export type SubmitStatus = 'idle' | 'sent' | 'error';

/** The picker confirms only a write that happened; anything else shows an inline error. */
export function submitStatus(written: boolean): SubmitStatus {
  return written ? 'sent' : 'error';
}
