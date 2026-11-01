# Berry Dashboard product requirements

## Product goal

Berry Dashboard is a multi-tenant business dashboard for small teams. A signed-in person can create or join a workspace, manage customer and invoice records, coordinate projects and tasks, and view organization-scoped reporting. Each workspace's users, records, and financial data must remain isolated.

## Users and access

- Workspace owners and admins manage membership and invitations.
- Managers create and update operational records, invoices, projects, and tasks.
- Members access permitted workspace records and update their assigned task status.
- Viewers can read permitted workspace data.
- Client memberships are not enabled for the dashboard API in this release.
- Anonymous visitors can register, sign in, and accept a workspace invitation after authentication.

## Functional requirements

### Identity and workspaces

- Support email/password registration, verification callback, login, logout, and session refresh through Supabase Auth.
- Support Supabase password recovery and reset callbacks.
- A new user can create a workspace and becomes its owner.
- A user who belongs to multiple workspaces can switch the active workspace.
- Requests must carry a valid user token and an active workspace membership. The organization header is a selector, not an authorization credential.

### Customers and operations

- Users can search and view workspace customers; authorized roles can create, edit, and delete them.
- Authorized roles can list, create, and update projects and tasks; assignment and role access are enforced in the API and database.
- CRM supports tenant-scoped deal creation, editing, stage changes, filtering, and pagination; financial amounts remain grouped by currency.
- Projects can be created and status tracked. Tasks can be created, filtered, and updated by managers or by members assigned to them.

### Invoices and money

- Authorized roles can create and edit draft invoices, issue an invoice, record payments, cancel eligible invoices, view payment history, and download an issued invoice PDF.
- The database calculates line totals, invoice totals, balances, and invoice numbers. Issued invoice details are snapshotted for document consistency.
- Payment writes require an idempotency key and enforce invoice currency and outstanding balance.
- Financial reporting must retain currency boundaries; values in unlike currencies must never be summed together.

### Team and invitations

- Owners and admins can list members, invite eligible roles, change roles/status, revoke invitations, and remove members.
- Invitation secrets are stored as hashes, expire, and are delivered through a configured email provider. Email sending is disabled when provider configuration is absent.
- Issued invoices can be emailed with the invoice PDF attached when the provider is configured.

### Reporting and honest empty states

- Dashboard metrics, analytics, statistics, and chart views use the selected workspace's database records.
- Reporting supports a date range of up to five years and separates currencies.
- Empty workspaces show zero counts or empty-state copy. Example records and invented activity are not presented as customer data.
- Blog posts and categories are tenant-scoped, with manager editing and published-post read access for workspace members.
- Notifications and append-only audit entries are generated for business record changes; users can read and dismiss their own workspace notifications.
- Tenant-visible CSV exports are available for customers, deals, invoices, projects, and tasks (up to 5,000 rows per export).
- Private file uploads use an organization-scoped Storage bucket and short-lived signed download links.

## Non-functional requirements

- Enforce tenant isolation with PostgreSQL RLS and request-scoped Supabase clients; do not use a service-role key for user flows.
- Validate API input, limit request rates, use secure response headers, and return non-sensitive errors.
- Keep credentials out of source control and browser bundles except the Supabase publishable key.
- Support a responsive desktop and mobile layout and accessible labels/actions.

## Current delivery state

Implemented in the current source: Supabase Auth flows including password recovery, workspace creation/switching/settings, profile editing, customer directory, team membership and invitations, invoice lifecycle/PDF/email, dashboard metrics, analytics/reporting pages, CRM deals, projects/tasks screens, blog management, notifications, audit capture, private file upload/download, CSV/PDF reports, project membership/comments, and backend smoke tests. Client portal, subscription entitlements/payment checkout, and full live tenant-isolation tests remain incomplete. See [Testing status](docs/TESTING.md) and [Setup guide](docs/SETUP_GUIDE.md) for environment-dependent steps.

## Acceptance criteria for production readiness

- Apply migrations to a non-production Supabase project and validate all SQL functions and RLS policies.
- Exercise two organizations and users with cross-tenant read/write attempts, plus owner/admin/manager/member/viewer role cases.
- Verify signup email redirects, invitation delivery/acceptance, invoice issue/payment idempotency, and PDF download end to end.
- Run build, lint, API checks, and browser workflows with configured credentials; add automated regression tests for these paths.
- Configure production domains, HTTPS, email provider, secrets, backups, and monitoring before launch.
