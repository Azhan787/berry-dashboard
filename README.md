# Berry Dashboard

Berry Dashboard is a React and Vite organization dashboard with a first multi-tenant business-data slice backed by Supabase Auth, PostgreSQL RLS, and an Express REST API.

## Implemented

- Email and password signup/sign-in through Supabase Auth, client-side session refresh, logout, and organization onboarding.
- Workspace selection for users who belong to more than one organization.
- Tenant-scoped customer list, search, create, and delete endpoints and UI.
- Tenant-scoped invoice drafts, issue/cancel workflow, idempotent payment recording, payment history, and PDF download.
- Live analytics/statistics/charts for invoices, collections, customers, projects, tasks, and deal pipeline, with currency-separated financial totals.
- Team member administration and invitation acceptance; email dispatch activates when Resend credentials are configured.
- Tenant-scoped project and task list/create/update API endpoints with role checks and database assignment constraints.
- CRM deal pipeline with create/edit/delete, stage filtering, pagination, and currency-separated visible pipeline amounts.
- Dedicated project and task screens; members may change only tasks assigned to them.
- Tenant-scoped blog posts/categories, notifications, append-only activity audit entries, private file upload/download, and CSV exports.
- Profile editing, organization settings, and Supabase password recovery/reset flows.
- Live customer search from the global search box; notification placeholders no longer invent alerts.
- PostgreSQL schema and RLS policies for profiles, organizations, memberships, invitations, customers, deals, invoices, projects, tasks, notifications, settings, and audit logs.
- API JWT verification and membership resolution use the request user's Supabase token; the server does not use the service-role key for tenant queries.
- Honest empty states: no sample customer, invoice, or business metric records are shown as real workspace data.

The implementation is not production-verified. Express starts and its health route responds; PDF report generation and project membership/comment APIs are implemented with an additive migration. The client portal, subscription usage enforcement, and payment-provider checkout/webhooks remain future work. Email invitations and invoice email require provider configuration. The invoice workflow records manual payments; it does not charge cards. Supabase migrations, Storage, RLS policies, and tenant isolation still need verification in a configured development project.

## Requirements

- Node.js 22.12 or newer and npm.
- A Supabase project.

## Local setup

1. Create a Supabase project and configure email signups / verification redirects for `http://localhost:5173`.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_BASE_URL`.
3. Copy `server/.env.example` to `server/.env`. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same project values. Keep secret keys out of the browser and source control.
4. Apply `supabase/migrations/202610310001_core_multitenant.sql` to the Supabase project, for example with `supabase db push` after linking the project.
5. Install dependencies with `npm install` and `npm --prefix server install`.
6. Start the API with `npm run server` and the frontend with `npm run dev` in a second terminal.

The frontend defaults to `http://localhost:5000/api/v1`; the Express health endpoint is `/health`.

## Commands

```sh
npm run dev
npm run build
npm run lint
npm run server
npm --prefix server start
```

## Security and deployment

See [PRD.md](PRD.md), [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md), [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/TESTING.md](docs/TESTING.md), and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The database migration must be applied before using the app. A production rollout also requires review of Supabase Auth settings, CORS origins, HTTPS, secrets, backups, and the unfinished product modules listed above.
# berry-dashboard-full-stack
# berry-dashboard-full-stack
# berry-dashboard-full-stack
