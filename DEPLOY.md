# Deploying the Khidmat AI Python backend

The Python service in `python-agents/` is the canonical backend. The root
`Dockerfile` builds the **legacy Node** service that is being retired — use
`Dockerfile.python` instead.

## Option A — Render free tier (no credit card)

Render builds straight from GitHub using `render.yaml`.

1. **Push this repo to GitHub** (Render reads the code from there).
2. Go to <https://dashboard.render.com> → **New → Blueprint**.
3. Connect the `BazaarAi` repository. Render detects `render.yaml` and proposes
   the `khidmat-python-api` service.
4. Before the first deploy, open the service's **Environment** tab and add:

   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | your Gemini key (the one in `backend/.env`) |

   It is intentionally marked `sync: false` in `render.yaml` so the key is never
   committed to the repo.
5. Deploy. When it finishes you get a URL like
   `https://khidmat-python-api.onrender.com`.
6. Verify:
   ```bash
   curl https://khidmat-python-api.onrender.com/health
   ```
7. Point the app at it — in `mobile-app/.env` and in the `production-apk` /
   `production` profiles of `mobile-app/eas.json`:
   ```
   EXPO_PUBLIC_PYTHON_API_URL=https://khidmat-python-api.onrender.com
   ```
8. Rebuild the APK: `cd mobile-app && npx eas-cli build -p android --profile production-apk`

### Free-tier caveat: cold starts
The free instance sleeps after ~15 minutes idle and takes ~30-60s to wake. The app
already handles this: `warmUp()` pings `/health` when the Home screen mounts, and
the pipeline calls use a 90s timeout (`PIPELINE_TIMEOUT` in
`mobile-app/src/services/api.js`). Expect the first request after idle to be slow,
not to fail.

## Option B — Google Cloud Run (needs billing enabled)

`deploy-python-cloud-run.bat` is ready and uses Cloud Build, so no local Docker is
required — only the gcloud CLI. It reads `GEMINI_API_KEY` from `backend/.env` and
passes it as a runtime env var rather than baking it into the image.

```bat
deploy-python-cloud-run.bat
```

## Important: bookings are still ephemeral

Both hosts run the container with a temporary filesystem, and bookings currently
live in `python-agents/data/bookings.json`. That means **booking data is lost on
every restart/redeploy and is not shared between instances**. This is expected until
the Phase 1 database layer lands; do not treat hosted booking data as durable yet.

## Never commit

`backend/.env`, `mobile-app/.env`, `service-account.json` and the `AI DATA DONT
COMIT/` folder are gitignored or must stay untracked. Secrets belong in the Render
dashboard or Cloud Run env vars.
