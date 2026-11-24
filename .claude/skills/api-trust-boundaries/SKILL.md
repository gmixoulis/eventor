---
name: api-trust-boundaries
description: Use when APIs trust client roles, tenants, emails, or URLs.
category: security
---

The server, never the request body or the screen, decides what a caller may see, which role they get, which tenant they belong to, and what free text may contain. Fix each rule once in shared code, then test it from an anonymous or foreign caller.

## Personal fields on list and detail routes
- Call the same visibility helper from the list path that the detail path uses. Do not write a second copy of the rule.
- Make the redacted field nullable in the shared schema (`email: string | null`) and use null-safe reads in callers. Never render a null field as text.
- Grep the field name across all routes, and test the anonymous list case with a regression test that fails when the fix is removed.
- Verify by counting: users returned and users with an email (for example 40 users, 0 emails). Report the counts, not the data.

## Roles at sign-up
- The server assigns the default role. A non-default role (speaker, exhibitor, admin) comes only from an explicit allowlist or an owner action, never from a field the caller sends.
- Probe each public register endpoint with every non-default role on a throwaway account. Record the status code and the role the account actually got. Expect rejection.
- A role that puts a person in a public list is a public data change. If the endpoint already accepts it, report it as a finding and leave the auth code alone until the owner decides.
- After a test sign-up, check the public list endpoints. Name the throwaway account in the report so the owner can remove it.

## Multi-tenant shared keys and ids
- When tenants share one signing key or one numeric user-id space, a token from tenant A is valid for tenant B unless the token names the tenant. Put the tenant slug in every access token minted in shared mode, and reject any token whose tenant claim differs from the request's tenant.
- Resolve the tenant from a trusted registry row, never from header text alone. Derive admin role from that tenant's own owner record, not a global list.
- A helper that loads a user from a token without request context cannot see the tenant claim. In shared mode it must refuse to run or be removed.
- Test that the same numeric user id logging in under two tenants succeeds only for the matching one. Keep single-tenant behaviour unchanged, and test both modes.
- Prove the tests have teeth: remove the tenant check once, confirm the cross-tenant tests fail, restore it, and report the result.
- When probing a live backend, set the tenant header to the app's `eventSlug` from the app config, not a guessed name. A wrong slug returns 404 `unknown_event`, which looks like an outage but is a bad tenant value.
- Storage keys are part of the boundary. Uploads and derived thumbnails stay under the tenant's prefix, and a derived file must not be re-derived endlessly.

## Links in free text
- Reject links with a negative lookahead after the domain: `(?![a-z0-9])`. A trailing-character list such as `(?:[/:\s]|$)` lets `evil.com!`, `evil.com,` and `evil.com.` through.
- Treat Unicode dot look-alikes (U+3002, U+FF0E, U+FF61) as dots, and test them.
- Run the same regex on the client and the server. Validated fields are echoed into share messages, where chat apps turn them into links.
- Add each bypass string to the unit tests, not only strings with nothing after the TLD. Check that real names still pass ("New York Design Week", "AI Summit 2027"), and say explicitly whether a name like "Node.js Conf" is refused.

## Rate limits and spend caps
- Key a per-IP or per-install limit on a value the server controls (the connection address the host records, a verified session id), never on a client-sent header or a body id. A caller who sends a fresh id each request skips the limit.
- Before trusting a forwarded-address header, confirm the host overwrites it. Until verified, treat it as client-controlled and report it as a finding.
- Give unauthenticated endpoints their own cap. An open endpoint that draws on the same daily budget as the paid feature can drain it for every user.
- Report the mechanism and the affected endpoints. Leave the limit change for the owner when it changes who can use the paid feature.
