# API

Base URL: `http://localhost:5000/api/v1`. Browser requests use `credentials: include`; the API sets and reads HttpOnly Supabase session cookies. Do not send or persist bearer tokens in frontend JavaScript. State-changing requests must include an `Origin` matching `CORS_ORIGINS`. Tenant routes also require `X-Organization-Id`; the server verifies the authenticated user has active membership in that organization. Success responses use `{ "success": true, "data": ... }`.

Auth endpoints include `POST /auth/login`, `/auth/signup`, `/auth/recover`, `/auth/session` (token exchange from the existing Supabase email callback), `/auth/refresh`, `/auth/logout`, and `/auth/password`; `GET /auth/session` returns the current identity. The response body never contains access or refresh tokens.

- `GET /auth/session` — validated current identity.
- `GET /profile` and `PATCH /profile` — read/update the authenticated user's profile.
- `GET /organizations` — organizations where the user has active membership.
- `POST /organizations` — create an organization and initial owner membership. Body: `{ "name": "...", "default_currency": "USD", "timezone": "UTC" }`.
- `GET /organization/settings` — workspace metadata. `PATCH /organization/settings` — owner/admin update of name, website, industry, company size, currency, timezone, and locale.
- `GET /customers?page=1&limit=20&search=...&status=active` — tenant customer page.
- `POST /customers` — create customer; fields: name, email, phone, company_name, status (`lead`, `active`, `inactive`).
- `PATCH /customers/:id` — update validated customer fields.
- `DELETE /customers/:id` — delete a tenant customer (foreign-key constraints may reject deletion when referenced).
- `GET /deals?page=1&limit=20&stage=proposal&search=...` — tenant deal page with customer summaries.
- `POST /deals`, `PATCH /deals/:id`, and `DELETE /deals/:id` — manager CRM operations. Values are decimal strings and stage values are constrained.
- `GET /blog?status=draft&search=...`, `GET /blog/categories` — tenant post/category data. `POST /blog`, `PATCH /blog/:id`, `DELETE /blog/:id`, and `POST /blog/categories` are manager-only.
- `GET /notifications` — current user's workspace notifications and unread count. `PATCH /notifications/:id/read` and `PATCH /notifications/read-all` mark them read.
- `GET /activity?limit=50` — owner/admin view of recent append-only organization activity.
- `GET /files` — list visible workspace file metadata. Managers upload via `POST /files` using the binary body, file MIME `Content-Type`, and URL-encoded `X-File-Name`; maximum 10 MB and allowed types are PDF, JPEG, PNG, WebP, text, and CSV. `GET /files/:id/download` returns a one-minute signed URL. Managers can `DELETE /files/:id`.
- `GET /exports/:resource.csv` — CSV for `customers`, `deals`, `invoices`, `projects`, or `tasks`, limited to records visible to the caller and at most 5,000 rows.
- `GET /reports/:resource.pdf` — PDF report for customers, deals, projects, tasks, or invoices, limited to records visible to the caller and at most 5,000 rows.
- `GET /invoices` — list organization invoices with customer name.
- `POST /invoices` — create a validated draft invoice; only owner, admin, or manager.
- `GET /invoices/:id` and `PATCH /invoices/:id` — view invoice/payment details or update an eligible draft.
- `POST /invoices/:id/issue`, `/payments`, and `/cancel` — controlled invoice lifecycle; payments require an `Idempotency-Key` UUID header.
- `POST /invoices/:id/send` — email the issued PDF to the customer. Requires a configured Resend provider and an `Idempotency-Key` UUID.
- `GET /invoices/:id/pdf` — download the immutable issued invoice PDF.
- `GET /organizations/:organizationId/members` and `/invitations` — owner/admin team administration.
- `POST /organizations/:organizationId/invitations`, `DELETE /invitations/:invitationId`, `PATCH` or `DELETE /members/:userId` — invite/manage members. Email invitations require configured Resend credentials.
- `POST /invitations/accept` — accept an invitation after authentication; body includes organization UUID and invitation token.
- `GET /projects` — list projects visible to the selected member.
- `POST /projects` and `PATCH /projects/:id` — create/update projects; owner, admin, or manager only.
- `GET /projects/:id/members`, `PUT /projects/:id/members/:userId`, and `DELETE /projects/:id/members/:userId` — list and manage project members; managers require the user to already belong to the workspace.
- `GET /projects/:id/comments` and `POST /projects/:id/comments` — list/add comments for users with project access.
- `GET /tasks?status=todo` — list tasks allowed by project assignment / role.
- `POST /tasks` — create a task; owner, admin, or manager only.
- `PATCH /tasks/:id` — managers can update validated fields; assigned members can change only status.
- `GET /dashboard` — counts for customers, active projects, open tasks, plus invoiced/outstanding totals when records share one currency. Mixed currencies are reported separately and never added together.
- `GET /analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` — date-bounded invoice/collection trends, customer growth, invoice statuses, deal pipeline, project statuses, and task statuses. The inclusive period can span at most five years; financial rows retain currency.

`GET /health` is outside the API prefix and returns API health plus whether the Supabase URL and publishable key are configured. `GET /ready` performs a database RPC and returns 200 only when the database is configured and reachable. Apply both SQL migrations before using data endpoints. Billing-provider checkout, client portal, and subscription entitlement API groups remain future work.
