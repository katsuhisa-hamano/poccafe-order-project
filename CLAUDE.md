# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"ぽっカフェ" (Pokka Cafe) — a pre-order/pickup system for a cafe. Customers browse a menu, place
orders for a specific pickup date, and admins manage stock, holidays, customers, and receipt
printing from the same single-page app.

## No build tooling

There is no `package.json`, no bundler, no linter, and no test suite. Files under `public/` are
served as-is. There are no build/lint/test commands to run — don't go looking for npm scripts.

There is also no `wrangler.toml` in the repo. Deployment is Cloudflare Pages connected directly to
this GitHub repo (push to deploy); D1 database binding (`DB`) and secrets (`SQUARE_ACCESS_TOKEN`,
`BREVO_API_KEY`, `ENCRYPTION_SECRET`) are configured in the Cloudflare dashboard, not in this repo.

`.gitignore` excludes `kakikori.js`, `square_menu.js`, `shema.sql` — these may exist locally as
scratch/experiment files but are intentionally untracked.

## Target devices

- Customer-facing screens: iPhone / Android phones, Chrome or Safari. Design and test for mobile
  viewport widths and touch input first — there is no meaningful desktop customer usage to design
  around.
- Admin screens (`adminView`, `menuEditView`, `customerEditView`, `holidayEditView`): iPad. Touch
  targets, on-screen keyboard behavior, and iPad Safari viewport quirks matter more than desktop
  browser compatibility here.

## Architecture

**Backend**: `functions/api/[[path]].js` is a *single* Cloudflare Pages Function (catch-all route)
that implements the entire API — ~30 endpoints — as one long sequential chain of
`if (path === '/api/...' && method === '...') { ... }` blocks (no router library, no separate
files per route). When adding an endpoint, follow this same pattern and CORS header handling
(`corsHeaders` set at the top, OPTIONS short-circuited first). Two helper functions
(`fetchSquareSalesMap`, `generate8CharPassword`) live at the bottom of the same file.

**Frontend**: also a single big file, `public/app.js` (~3500 lines), loaded by `public/index.html`
(a static shell with `.view` sections, all hidden by default, plus modals). No modules/imports —
everything is one script plus `public/custom_alert.js` (a shared alert/confirm dialog replacement
for native `alert()`/`confirm()`). Styling is Tailwind via CDN (`public/styles.css` only holds a
few overrides), date picking via flatpickr (also CDN).

Key pieces in `app.js`:
- `adminView`, `menuEditView`, `customerEditView`, `holidayEditView` — objects with a `render()`
  that returns an HTML string for that admin screen. Not rendered until navigated to.
- `router.go(view)` — client-side router. Toggles which `#view-*` element is visible and, in a
  `switch` on `view`, lazy-loads/re-renders that screen's data. Note the `'holiday-edit'` case has
  no `break`, so it falls through into `'home'`'s load logic too — this is existing behavior, not
  a typo to "fix" in passing.
- `app` — the actual application: one object holding all state (`app.state`) and every action
  method (login/register, cart, order submission, all admin CRUD, printing). There's no
  state-management layer; UI updates are direct DOM manipulation from these methods, invoked via
  inline `onclick="..."` handlers inside the template strings above.

**Square as the source of truth for the catalog**: this app does not own product data. Menu items,
prices, images, variations, and modifiers are fetched live from the Square Catalog API
(`connect.squareup.com/v2/catalog/...`) on essentially every menu load. D1 only stores the
app-specific overlay on top of that: visibility flags, remaining stock per variation, stock
grouping (multiple variations sharing one manufactured quantity), sort order, and available days.
Customer identity is similarly synced against the Square Customers API — `square_customer_id` is
the primary key/foreign key used for users throughout (see `users`, `orders`).

**`schema.sql` is stale.** It does not match what the code actually queries — e.g.
`menu_variations`, `menu_stock_groups`, `daily_manufacture_adjustments`, `settings`, and
`order_item_modifiers` are all queried in `functions/api/[[path]].js` but absent from `schema.sql`,
and `users`/`orders`/`order_items` are queried with columns (`password_hash`, `verify_token`,
`is_admin`, `customer_name`, `variation_id`, `unit_price`, etc.) that aren't in it either. Treat
`schema.sql` as a rough historical starting point only — infer the real schema from the SQL in
`functions/api/[[path]].js`, or check the live D1 database, before assuming a column exists.

**Stock/availability logic** (`POST /api/orders`, `GET /api/admin/daily-stats`) combines four
numbers per variation for a given date: the manufactured quantity (an admin override for that day,
else a shared "stock group" total, else the default), reservations already placed
(`order_items`), Square POS walk-in sales for that date, and pickups already marked received —
remaining = manufactured − (reservations + POS sales − pickups already counted). Variations can
share one manufactured quantity via `stock_group_id`; when they do, all reservations/sales across
the group are summed before comparing against the shared total. Read this logic in
`functions/api/[[path]].js` (search `remainingCount`) before changing anything stock-related — it's
easy to double-count or under-count across the group vs. single-item paths.

**Receipt printing bypasses the backend entirely for the actual print**: from the admin UI,
`app.js` posts a SOAP/XML job directly from the browser to a LAN receipt printer at a hardcoded
address (`192.168.12.150:3000`) — this only works when the browser is physically on the shop's
network. The Cloudflare Function is only used afterward, to mark orders as printed
(`/api/admin/update-print-status-bulk`).

**Email** (verification, password reset) goes through the Brevo Transactional Email API directly
from the Pages Function (`sendTransactionalEmail` helper) using `env.BREVO_API_KEY`, sending from
`poccafe73@gmail.com` (verified as a single sender in Brevo — no owned domain required); if the
binding is missing, the code logs a warning and silently skips sending rather than failing the
request.

**Auth** is homegrown, not a framework: SHA-256 password hashing (no salt), UUID tokens for
email-verify/password-reset stored directly on the `users` row with an expiry timestamp, and no
session/cookie mechanism — the logged-in user's identity is just kept in the frontend's in-memory
`app.state.user`.
