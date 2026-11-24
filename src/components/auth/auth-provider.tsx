import { router, usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

import { setSignInRequiredHandler } from '@/components/auth/require-sign-in';

/**
 * Registers the handler the store calls for signed-in-only actions on guest
 * screens. Re-registers whenever the route changes so `next` is always current.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    setSignInRequiredHandler(() => {
      router.push({ pathname: '/sign-in', params: { next: pathname } });
    });
    return () => setSignInRequiredHandler(null);
  }, [pathname]);

  return <>{children}</>;
}
