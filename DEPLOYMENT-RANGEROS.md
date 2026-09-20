# RangerOS feedback deployment

Public board: https://feedback.rangeros.com.au

This fork retains OpenHeard under AGPL-3.0. The public footer links to this source.
Upstream base: `0b12956ed229bc6101d21a716b80257f1a605e65`.

## Resources

- Cloudflare Worker: `rangeros-feedback`
- D1: `rangeros-feedback` (Oceania)
- KV: `RANGEROS_FEEDBACK_CACHE`
- Single workspace: `default`; ROOT_DOMAIN stays empty.
- Sender: `noreply@feedback.rangeros.com.au`; Cloudflare Email Service DNS configured on the feedback subdomain.
- Admin ownership is provisioned explicitly. New Clerk identities are guests until invited to the team; no first-user admin promotion.
- Authentication uses the same production Clerk instance as RangerOS. Shared subdomain sessions are handled by Clerk. Legacy password/magic-link endpoints are retired.
- Public posting and voting require an account. Avoid sensitive organisation/location details in requests.

## Deploy

```sh
bun install --frozen-lockfile
bun run --filter web build
bun run check-types
bun run --filter web test
bunx wrangler d1 migrations apply rangeros-feedback --remote
bunx wrangler deploy
```

`CLERK_SECRET_KEY` is the existing RangerOS production secret, stored only as a Worker secret.
Set it with `bunx wrangler secret put CLERK_SECRET_KEY`. The public key and
RangerOS sign-in URLs are in `apps/web/src/lib/clerk-config.ts`.
Do not use the upstream Alchemy deployment for this instance; `wrangler.json`
is its deployment configuration. No demo reset cron is configured.

The SSR bundle includes dependencies to avoid runtime CommonJS React imports
in Workers. The workerd export condition ensures TanStack selects server history.

Admin signs in with RangerOS. A verified primary Clerk email links the provisioned
owner account while preserving its ID and membership. Later requests use the unique
Clerk ID. Username-only users get non-deliverable internal addresses and email
notifications disabled (no implicit membership). Existing memberships are never overwritten.
Email DNS/binding configuration does not prove inbox delivery.

## Verification (20 September 2026)

Production HTML returned 200 with RangerOS branding. A temporary member signed
up through Better Auth, created a request through the same server function as
the UI, removed/re-added its vote, and an unauthenticated vote was rejected.
D1 was checked for the persisted count. Temporary records were then removed.
Build, typecheck and 19 upstream tests passed. Browser control was unavailable,
so rendered click-through and email inbox delivery were not verified.

## RangerOS branding

Official mark, wordmark and app icon are copied from RangerOS. The public board,
sign-in, favicon, link previews and email templates use RangerOS branding.
Forest and cream match the RangerOS palette; ochre highlights votes and links.
OpenHeard attribution and the fork source link remain in the footer.

## Shared Clerk auth (21 September 2026)

Source: https://github.com/yumaitau/rangeros-openheard

The TanStack Start Clerk middleware validates every request. Server functions
and raw routes use the validated Clerk identity; Better Auth cookies no longer
provide access. The browser provider uses the same instance and sends sign-in
and password recovery to RangerOS. Sign-out ends the shared RangerOS session.
Dynamic HTML is private/no-store so Clerk handshakes and session refreshes are
never bypassed by a shared HTML cache. Static assets remain cacheable.

The additive `0011_clerk.sql` migration preserves existing users, memberships,
posts and votes. Only verified matching emails can link a legacy account.

Clerk's production subdomain allowlist includes both `app.rangeros.com.au`
and `feedback.rangeros.com.au`; the allowlist remains enabled.

Validation: typecheck/build and 29 tests passed. An existing RangerOS test
identity signed in through Clerk at the app origin; that same client/session
refreshed at the feedback origin and authenticated using feedback cookies.
The live vote server function added and removed a temporary vote; anonymous
and forged tokens were rejected. D1 confirmed zero remaining votes before
cleanup. Legacy auth returned 410; a member could not open the admin inbox.
Browser automation was unavailable, so a rendered click-through was not verified.

Server functions retain same-origin CSRF middleware. Visiting the public board
does not create team membership. Account-link refusals show a public notice and
allow guest browsing while authenticated writes remain denied.
