# Setup guide

1. Install Node.js 22.12+ and npm (the workspace was checked on Node 24.19.0 and npm 12.0.2).
2. Create a Supabase project and enable email/password authentication. Set the site URL and redirect allowlist to the local frontend URL.
3. Copy `.env.example` to `.env`; enter the project URL and publishable key.
4. Copy `server/.env.example` to `server/.env`; enter the same URL/key and allowed frontend origin. Do not configure a service-role key for this app flow.
5. Install frontend and API dependencies: `npm install` and `npm --prefix server install`. Lockfiles are maintained at the project root and `server/package-lock.json`.
6. Link the Supabase CLI to a development project, review both migrations, then apply them: `supabase link --project-ref <ref>` and `supabase db push`. Do not push unreviewed SQL to production.
7. Run `npm run server` and `npm run dev` in separate terminals. Open the Vite URL, register, verify the email if enabled, sign in, and create a workspace.

The core migration creates the private `berry-private` Storage bucket and its organization-folder policies. The follow-up migration adds project comments. Confirm the `storage` schema is available and review the allowed MIME types/10 MB cap before deployment. For invitation and invoice email, set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, `EMAIL_FROM`, and `APP_BASE_URL` in `server/.env`. Email is disabled unless all required values are present. The current payment workflow records manual bookkeeping entries; there is no card checkout or verified payment webhook yet.

For this workspace's restricted npm environment, dependencies were installed with a project-local writable cache. If your normal npm cache is writable, standard commands above are sufficient. If you receive cache permission errors, from PowerShell in the project directory run `npm --prefix server install --cache .\\work\\npm-cache --logs-dir .\\work\\npm-logs`. If the registry itself is blocked, retry from a network that permits `https://registry.npmjs.org/` rather than using offline mode without a populated cache.

PowerShell setup commands from the project directory:

```powershell
Copy-Item .env.example .env
Copy-Item server/.env.example server/.env
npm install
npm --prefix server install
npm run lint
npm run build
npm run server
# In a second terminal:
npm run dev
```

The app is not seeded with fake customer or revenue records. For a new workspace the dashboard correctly starts at zero.
