# Sela Cerita Platform Architecture

## Product direction
Sela Cerita is a self-service personalized website builder for meaningful moments. Customers create an account, select a template, personalize supported content through a Guided Editor, preview their site, pay, and publish a shareable page.

Core principle: customers personalize content and approved design settings; the platform owns the template structure and code.

## MVP customer journey
1. Register / sign in.
2. Open a private dashboard.
3. Select an active template (Bloom, Chapter, Playdate).
4. Create a project bound to that template.
5. Edit allowed fields: names, dates, text, photos, and approved appearance options.
6. Preview the project.
7. Place an order and complete payment.
8. After server-side payment verification, admin/platform marks the order paid.
9. Publish the website and issue a public URL.

## Architecture
- Frontend: HTML, CSS, Vanilla JavaScript (existing brand/catalog site remains static).
- Authentication: Supabase Auth.
- Database: Supabase Postgres.
- Photo storage: Supabase Storage, private project folders before publication.
- Payment: Midtrans or Xendit, selected after merchant onboarding and integration review.
- Publishing: a server-side publishing service / dynamic hosting. GitHub Pages remains suitable for the public marketing catalog, but not as the customer-project database or secure publishing backend.

## Main entities
- profiles: customer profile and role.
- templates: available template catalogue and version.
- projects: customer-owned website project, selected template, editable content JSON, publication state.
- orders: package, amount, payment provider, and payment state.

## Security rules
- Supabase Row Level Security (RLS) is enabled on every customer-facing table.
- A customer can read and update only their own profile and projects.
- A customer cannot set their own role to admin.
- A customer cannot mark an order paid or publish a project by changing browser-side data.
- Payment status and publication are changed only by trusted server-side code or an authorized admin.
- Storage object paths are scoped by authenticated user and project. Public image delivery is enabled only where deliberately needed.
- Template IDs and editable JSON are validated server-side; customers never upload or execute HTML/JavaScript.

## Guided Editor data model
Each template defines an allow-list of editable fields and settings. A project stores customer content as JSON, for example:
{
  "names": { "first": "A", "second": "B" },
  "eventDate": "2026-11-12",
  "heroTitle": "Our little story",
  "story": "A short personal note",
  "gallery": [],
  "appearance": { "accent": "peach" }
}
The renderer combines trusted template code with validated project content. Do not store arbitrary customer-provided markup or scripts.

## Suggested repository evolution
- Keep index.html, styles.css, and script.js as the marketing/catalog site.
- Add app/ for authenticated dashboard and editor screens.
- Add supabase/schema.sql for database setup.
- Add docs/ for product, architecture, and operational notes.
- Keep demos/ as public template demonstrations.

## Delivery phases
1. Foundation: database schema, RLS, storage policy, Supabase project setup.
2. Accounts: registration, login, session handling, protected dashboard.
3. Templates and projects: template catalogue, create project, ownership enforcement.
4. Guided Editor: field forms, photo upload, live preview, autosave.
5. Orders and payment: pricing, checkout, server-side payment verification.
6. Publishing: public project route, domain/slug, publish/unpublish controls.
7. Admin: customer support, template management, order management.

## MVP scope boundaries
For the first release, support one project per purchase, three existing templates, up to five photos per project, basic text/date edits, and a small set of safe appearance options. Defer drag-and-drop layout editing, custom domains, subscriptions, and complex automation.
