# Elevate Commerce CRM

Authenticated Next.js CRM backed by Convex and Better Auth.

## Database design

The Convex schema mirrors the local JSON ledger:

- `clients`: all imported client fields, credential fields, assignment fields, care fields, and contract fields
- `leads`: all imported lead fields
- `plEntries`: monthly finance and payout records
- `cables`: cable cost register
- `settings`: teams, assistants, and referral partners
- `metadata`: import source and generated date
- `importRuns`: import audit trail with counts, timestamps, and source labels

Credential values are stored in Convex only. The source `data.js`, generated import files, `.env.local`, and local Convex deployment state are intentionally excluded from Git.

## Local setup

```powershell
npm install
$env:CONVEX_AGENT_MODE="anonymous"
npx convex dev
```

In another PowerShell window:

```powershell
npm run seed:local
npm run dev:frontend
```

To import the exact latest browser backup instead of the original `data.js` seed:

```powershell
node scripts/import-local-seed.mjs C:\path\to\elevate-crm-backup.json
```

Open `http://localhost:3000/signin`, create the first account, and sign in.

## Deployment

For a linked Convex cloud project, set:

```text
BETTER_AUTH_SECRET=<generate-a-random-secret>
SITE_URL=<your-public-app-url>
```

Configure the frontend environment from `.env.example`. Import credential-bearing JSON only into the intended protected Convex deployment.

To create a real Convex cloud deployment for this project, first run:

```powershell
npx convex login
```

Then create or select the cloud deployment and deploy the backend:

```powershell
npx convex deployment create production --type prod --select
npx convex deploy
```
