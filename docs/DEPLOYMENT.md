# Deployment

Deploy the Vite frontend as a static site and the Express API as a Node 22.12+ web service. Configure the frontend build command `npm run build` and publish `dist/`. Configure the API working directory `server`, install with `npm install`, and start with `npm start`.

Set `VITE_API_BASE_URL` to the deployed API `/api/v1` URL and `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` at frontend build time. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PORT`, and exact `CORS_ORIGINS` on the API. The API listens on `PORT` and exposes `/health`. Add deployed frontend origins to Supabase Auth redirect settings. Use HTTPS and platform-managed secrets.

Do not deploy until the SQL migration has been reviewed/applied, provider-specific build/start behavior is configured, auth redirects and CORS are tested, database backups/monitoring are enabled, and remaining unsupported modules are understood. Resend-based invitation and invoice email can be enabled with server environment variables. Payment recording is manual bookkeeping only; there is no card checkout, payment provider, or verified webhook integration. Client portal and subscription entitlement enforcement are not implemented. Validate the private Storage bucket policies in the target project before uploading business files.
