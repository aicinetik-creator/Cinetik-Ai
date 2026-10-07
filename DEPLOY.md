# Deployment — Cinetik Editor

## Where it runs

- **Host:** Netlify (site `cinetik-editor`, team `aicinetik`)
- **Source:** this repository, branch `main`
- **Build:** `npm run build` from `apps/web` (configured in `netlify.toml`)
- **Temporary URL:** https://cinetik-editor.netlify.app
- **Target domain:** https://edit.cinetik.in (add via Netlify → Domain management, then
  create the DNS record it shows at whoever manages cinetik.in's DNS)

## Environment variables (set in Netlify → Project configuration → Environment variables)

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL of the editor (`https://edit.cinetik.in`) |
| `NEXT_PUBLIC_MARBLE_API_URL` | Template/asset API |
| `DATABASE_URL` | Postgres (only needed for accounts/cloud projects) |
| `BETTER_AUTH_SECRET` | Auth signing secret (random, generated at deploy time) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Redis (rate limiting) |
| `MARBLE_WORKSPACE_KEY` | Template workspace |
| `FREESOUND_CLIENT_ID` / `_API_KEY` | Sound effects search |

Note: `NEXT_PUBLIC_*` values are baked in at build time — after changing them, redeploy
(Deploys → Trigger deploy → Clear cache and deploy site).

## Notes

- The editor runs entirely in the visitor's browser; videos are never uploaded.
- Every push to `main` triggers a new production deploy.
