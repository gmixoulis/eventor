/** True when `pathname` is one of `prefixes` or a nested route under one ("/ask" matches "/ask/x", not "/asked"). */
export function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
