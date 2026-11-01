# Security

- The browser uses only the Supabase publishable key. Do not put a Supabase secret/service-role key in `VITE_*` variables or commit local env files.
- The API validates access tokens with Supabase Auth, resolves membership from the database, and sends the same user JWT with all database requests so RLS remains active.
- Every implemented tenant API route requires an organization header and checks active membership. Queries include the organization ID and RLS independently constrains the result.
- The organization-creation function is security-definer only to atomically create an organization and its first owner. It checks the caller identity and uses an empty `search_path`; execute access is limited to authenticated users.
- RLS is enabled on tables in the migration. Membership roles are not user-editable. Audit log mutation is denied.
- Task changes use a SECURITY DEFINER RPC with explicit role and assignment checks; authenticated users have no direct task update grant. Invoice/payment tables are direct-read only, and write operations use validated SQL functions.
- Private file objects live under an organization UUID folder in a private Storage bucket. Storage RLS checks active organization membership; downloads use one-minute signed URLs. File size and MIME type are restricted by the API and bucket configuration.
- Activity triggers write append-only audit entries and user-targeted notifications for organization business record changes.
- Express uses Helmet, JSON body limits, a configurable CORS allowlist, and rate limiting. Inputs are validated with Zod.
- Browser sessions use local storage because the current frontend is a static Vite app using bearer tokens. This increases exposure if an XSS vulnerability is introduced; production should consider a same-site secure cookie/BFF session design.

Before production, run Supabase security advisors, test tenant A/B with separate real accounts, validate every RLS and Storage policy in the deployed project, configure HTTPS and exact CORS/Auth redirect origins, add backups/monitoring, and finish authorization around the client portal and subscription modules. No formal penetration test or end-to-end tenant isolation suite has been run.
