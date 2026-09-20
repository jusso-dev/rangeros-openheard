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
- Admin ownership is provisioned before public signup. Do not delete the last admin or empty the user/membership tables: upstream promotes the first signup.
- Password and magic-link authentication are separate from RangerOS login.
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

`BETTER_AUTH_SECRET` is stored as a Worker secret, never in Git. Set it with
`bunx wrangler secret put BETTER_AUTH_SECRET` for a new installation.
Do not use the upstream Alchemy deployment for this instance; `wrangler.json`
is its deployment configuration. No demo reset cron is configured.

The SSR bundle includes dependencies to avoid runtime CommonJS React imports
in Workers. The workerd export condition ensures TanStack selects server history.

Admin signs in at `/login` with the provisioned owner email using a magic link.
Email DNS/binding configuration does not prove inbox delivery.

## Verification (20 September 2026)

Production HTML returned 200 with RangerOS branding. A temporary member signed
up through Better Auth, created a request through the same server function as
the UI, removed/re-added its vote, and an unauthenticated vote was rejected.
D1 was checked for the persisted count. Temporary records were then removed.
Build, typecheck and 19 upstream tests passed. Browser control was unavailable,
so rendered click-through and email inbox delivery were not verified.
