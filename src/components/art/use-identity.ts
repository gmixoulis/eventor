import { identitySpec, type IdentitySpec } from '@/art/identity';
import { getPerson } from '@/data';
import { useProfile, useSession } from '@/store';

/** A sample person's mark, from their own selections; undefined when the id is unknown. */
export function personIdentity(personId: string): IdentitySpec | undefined {
  const person = getPerson(personId);
  return person ? identitySpec(person) : undefined;
}

/** The signed-in account's mark, from the profile's current selections. */
export function useMyIdentity(): IdentitySpec {
  const { profile } = useProfile();
  const { account } = useSession();
  return identitySpec({ id: account?.id ?? 'guest', selections: profile.selections, role: profile.role });
}
