# Memo E2E Test Plan

> **Targets.** What the tests run against is set by the config (`MEMO_E2E_CONFIG`, or `config/config.json`); the templates in `config/` explain each one.
>
> - `docker` — the tests start an app server and a DB server of their own, in containers, and leave the checkout's `.env` and any server running on it alone. The DB starts either `empty` (the migrations only; needs nothing else) or as a `copy` of the DB the checkout's `.env` points at; on either, the tests create the global admin they log in as (`DOCKER_ADMIN` of `lib/config.ts`, logged at the start of a run), so the config has no `ui.admin`. The suite has to pass on both: on `empty` to show the tests rely on nothing but themselves, on `copy` to show they hold next to real data, as on an rc server. Its DB is in memory, which makes a restore about three times as fast.
> - `local` — an app server that runs already, with its DB snapshotted and restored directly. The global admin of the config (`ui.admin`) has to exist there; no user is created in a DB the tests do not own.
> - `rc` — a deployed server, its DB handled through the DB dump API of the deployment that manages it. Each run leaves its dumps on that server (eleven for all the layers, and one for each failed test): the API has no way to delete them. The server names the file of a dump by the second it was asked for, so the tests ask for one at a time, at least 1.5 s apart, and stop if another dump of that second turns up.
>
> **Not on a DB in real use.** A start on the `local` or `rc` target is refused if the server reports the `production` environment; on `local` also if the `.env` is of that environment or points at a DB other than the config's `expectedDB`; on `rc` also if the server under test is the one with the DB dump API (`lib/guards.ts`).
>
> **Browsers.** The tests that drive a page are tagged `@ui` (a test that takes the `page` without the tag, or the other way round, fails) and run in the projects `chromium` and `firefox`; the rest run once, in the project `api`, which starts no browser (the `api` fixture has a session of its own; `pageApi` is the API in the session of the page). `--project=<name>` picks projects, `--grep @ui` the page tests in every browser. Firefox has to be installed for Playwright once: `pnpm exec playwright install firefox`.
>
> **State reuse mode.** The teardown of a run archives `.state/` (layer dumps + session cache) into `.state/prev_run/` rather than deleting it. Re-run with `MEMO_E2E_REUSE_STATE=1` to skip facility/clients/groups/meetings setup — the setup restores `.state/prev_run/*` back into `.state/`, and tests find their layers already cached. The archive is used only if it was made today, against the same target, with the same code that the layer setups may be made of (all of `lib/`, and the app's list of holidays), and if the DB is still as that run left it (by table checksums; the log, and the last-opened facility and the UI storage of the users, aside). Otherwise the run logs why and starts fresh, from the DB as it is — always on the `rc` target, which has no table checksums to tell a changed DB by.
>
> **One run at a time.** A run holds `.state/run.lock`; a second one started meanwhile is refused, and touches neither the DB nor the state — but Playwright empties `test-results/` before the setup gets to refuse, so the failure artifacts of the run in progress are lost. A start that finds the state of a run that did not tear down (killed, crashed) is refused too, and changes neither the DB nor the state: run with `MEMO_E2E_RECOVER=1` to have that run's clean DB state restored first.
>
> **Read-only tests are checked.** On the `docker` and `local` targets, as is the state of the DB on reuse above (the `rc` target has no table checksums). After a passing `readOnlyTest` the table checksums are compared with the layer's; a test that changed the DB fails with the names of the tables.

Candidate Playwright integration tests, grouped by the DB-state layer they should run in. Entering a layer costs ~7s of DB ops, so granularity is "feature area" rather than "single endpoint".

Difficulty legend:

- **E** — Easy: fill a form / read text. No special prep beyond layer state.
- **M** — Medium: multi-step UI, API setup inside a test, dialog/popover interactions, or non-trivial assertions on dynamic content.
- **H** — Hard: external system interaction, time control, OTP secret generation, file uploads, complex async sequencing, or cross-browser nuance.

Implementation marker: tests already implemented are prefixed with ✅ and a `(file)` pointer.

Where a test needs something out-of-the-ordinary, it's called out in the notes.

---

## Current state (2026-10-09)

- **Size:** 402 tests: 155 that talk to the server alone (the project `api`) and 247 that drive a page (the projects `chromium` and `firefox`, each running all of them). On the `docker` target, with either base, a few minutes for `api`, about 34 for `chromium` and 32 for `firefox`; 45–50 minutes without Firefox on the `local` target against a remote DB. One worker. One test is a `fixme` (the "Excel CSV" encoding, see Reports / attendants); five are expected to fail (`test.fail`: four under "Values of attributes", one under "Meeting CRUD").
- **Last verified:** on the `docker` target, a full run of all three projects on 2026-10-08, before the tests of the attribute values were added (so of 325 tests): 506 passed, 6 skipped, 2 failed — both on trace files deleted under the run by a Playwright UI started next to it, and both passing in a rerun of their specs. The 77 tests added since (the values of attributes, the fields of the forms, the pages and the tables) were run with their spec files as they were written; then, on 2026-10-09, with the browsers switched to the Polish locale and the expectations of dates and times rewritten for it, the whole `firefox` project passed (235 passed, 12 skipped: the CSV exports and the `fixme`), and in `chromium` a whole run (223 passed, 1 skipped, 23 failed on the formats of the old locale) was followed by the nine spec files of those failures passing whole. The `api` project was last run whole before the locale change, which does not reach it. The `local` target was last run on a few tests only. The `rc` target was run for the first time, on a few tests: the dumps, the restores and the layers work there; the server at hand ran an older version of the app than its DB, so most tests could not pass on it.
- **Entries without ✅** are either not written (the reason and the difficulty are in the entry), not applicable (_n/a_), or deliberately left out (see Anti-tests). What is missing or weak is summed up in "Gaps and weak spots" at the end.
- **App fixes the tests led to**, merged: the denial for a non-member on a facility URL, the `resources` parameter of a calendar link, the facility edit toast, `notification/method` for a client with no methods, "not found" for a malformed id, `PATCH /user` refusing a foreign facility, the calendar's "today" in another time zone, the redirect from `/` while the facilities list is loading, `otpConfigure` recording the time step of its code, the log-out button of the forced password change form, the session race (a request in flight undoing a logout or a password change), a table that stopped storing its settings (shown columns, widths) once its columns were configured again — after a change of the language, or of the attributes (`TQueryTable.tsx`; seen in Firefox only because of the order things load in), `meeting/conflicts` returning the ids of attendance rows where the ids of the users were meant, a client added to a meeting before the client groups were loaded getting no group (`MeetingAttendantsFields.tsx`).

---

## Layer 0 — clean DB (no facility yet)

Tests at this level intentionally don't enter the Test Facility layer because they need a pristine state.

### Authentication & login

- ✅ **Login with bad credentials shows error** — submit wrong password, assert error text. _(E)_ `(login.spec.ts)`
- ✅ **Login with empty email field shows validation** _(E)_ `(login.spec.ts)`
- ✅ **Login throttle: the 6th attempt within a minute is rate-limited** — API-level: 429 with a `Retry-After`; counted per address, whatever the account and the outcome. The test leaves the throttle exhausted; the next login of the run clears it on the `docker` target, and waits up to a minute on the others. _(M)_ `(login.spec.ts)`
- ✅ **Login with developer toggle (global admin only)** — the UI has no toggle to turn it on, only `window.developerLogin(true)`; the test calls that, checks `permissions.developer` in `user/status`, the header wrench button and the developer-only sidebar links, then turns it off through the header's "Developer logout". Runs on a global admin created in the test, so a failure cannot leave the flag on the shared admin's cached session. _(M)_ `(developer.spec.ts)`
- ✅ **Developer login request from a non-global-admin is not honoured** — bonus; `{developer: true}` is validated as an ordinary login (400) and the permission stays off. _(E)_ `(facility.spec.ts; Test Facility layer)`
- ✅ **Theme chosen on the login form persists across reloads** — bonus. _(E)_ `(login.spec.ts)`
- ✅ **Persisted email pre-fills on next login** — relies on localStorage; second navigation should pre-fill. _(E)_ `(login.spec.ts)`
- **Screen saver appears after 10-minute idle** — needs `clock.fastForward`. _(M; needs clock control)_
- ✅ **Logout from header popover ends session** — covered as part of the "persisted email pre-fills" flow (logout is exercised mid-test). _(E)_ `(login.spec.ts)`

### Password change (logged-in user, before any facility activity)

- ✅ **Change password with wrong current password fails** — UI-level on a freshly-created user. _(E)_ `(password.spec.ts)`
- ✅ **Change password that doesn't meet rules fails** — implemented as a single weak-password variant; more variants left for future. _(E)_ `(password.spec.ts; UI-level)`
- ✅ **Change password that's uncompromised passes; next login uses new password** — happy path + old-password rejection on a fresh user. _(M)_ `(password.spec.ts; UI-level)`
- ✅ **Repeat-password mismatch shows error** _(E)_ `(password.spec.ts; UI-level)`

### OTP setup (logged-in user)

All in `otp.spec.ts`, each test on a user created in it. The codes are computed from the secret by `lib/totp.ts`; the backend takes the code of the previous, current or next 30-second step, and only one of a later step than the last code used, so a test sends the code of the next unused step and needs no waiting. The spec logs in a lot and waits the login throttle out (about 3 minutes in all).

- ✅ **OTP is configured with a valid code of a generated secret, once** — API: no secret without the password, no configuring without a secret, a malformed and a wrong code refused (the secret stays), a valid one accepted, no second secret afterwards. _(M)_
- ✅ **Login of a user with OTP needs a code, a newer one than the last code used** — no code: 400; the code that configured the OTP: refused; the next one: accepted, and refused when sent again. _(M)_
- ✅ **A user without OTP logs in without a code, until the deadline for configuring it** — `otpRequiredAt` set by the global admin: in the future the login works (and a code is refused as unexpected), in the past it is refused, cleared it works again. _(M)_
- ✅ **Global admin removes a user's OTP; it cannot be set for the user by the admin** _(M)_
- ✅ **OTP is configured in the user settings, and then asked for by the login form** — UI: password, then the code (a wrong one first; the right one typed with a space in the middle); after a logout the login form asks for the code once the password is in, and logs in when the code is complete. _(M)_
- **The generated secret expires after a minute** — not tested: it needs a real wait of a minute (the check is on the server).
- ✅ **A user with a deadline for OTP is prompted to configure it on every page load** — the form opens by itself with the "required" line; dismissed, it leaves a warning mark on the settings button and on its menu item, and is back after a reload; with the deadline cleared there is neither. _(E)_
- **The QR code; the expiry of the generated secret** — not tested: the code is an image of a URL the tests build themselves, and the expiry needs a wait of a minute.

### Public/system pages

- ✅ **About page renders app version + commit hash** _(E)_ `(system.spec.ts)`
- ✅ **About page shows the state of the server to the global admin, and links to the help** — the environment as `system/status` has it, the link to the commit, and for the last dump, the load and the free disk space a number where `system/status` has a value and a dash where it has none; the links to the changelog and to the privacy policy. A facility user gets the version, the environment and the commit only (`facility.spec.ts`). _(E)_ `(system.spec.ts, facility.spec.ts)`
- ✅ **A path that is no endpoint, no document and no image is answered with 404** — `exception.route_not_found` from the API, 404 for a missing help document or image; any other path gets the app. _(E)_ `(system.spec.ts)`
- ✅ **Help index lists topics; navigating to one renders markdown** — a smoke check in the testing language (which shows one fixed document on every help path), and in Polish: `/help` leads to the index, a link of it to the topic with its own heading and tab title; an unknown topic shows the docs not-found page. Not covered: `/help/dev`. _(E)_ `(system.spec.ts)`
- ✅ **Every link of the help index leads to a help page, with its images loaded** — a page load per topic (about a minute); the version log is left out of the walk, as opening it marks the news as read. _(E)_ `(system.spec.ts)`
- ✅ **The menu links to the news of the current version until the version log is opened** — the link's target follows the app's version; the version log shows its heading and the section of the current version, put together from a part per version with nothing left unresolved; the link is then gone for good. _(M)_ `(system.spec.ts)`
- ✅ **The link to the news is dismissed with its close button, for good** _(E)_ `(system.spec.ts)`
- ✅ **An info icon shows a help page in a modal, with a link to the full page** — the icon of the user settings; in Polish, as the help is. Escape closes the modal and the page under it stays; the link leads to the full help page. _(E)_ `(system.spec.ts)`
- ✅ **The developers' help shows its index and follows a link in it** — `/help/dev`, in English: the heading, the browser tab's title, the logo loaded, a second page. A smoke test. _(E)_ `(system.spec.ts)`
- ✅ **Dictionary list endpoint returns fixed dictionaries** — bonus _(E)_ `(system.spec.ts)`
- ✅ **System status JSON endpoint reachable** — direct `api.get("system/status")`, not a UI test; also pins that a caller who is not logged in gets the state of the server (see the app problems). _(E)_ `(system.spec.ts)`
- ✅ **Translation list endpoint returns the testing-language pack** _(E)_ `(system.spec.ts)`

### Global admin: bootstrapping

- ✅ **Create first facility** — API-level. _(M; UI form has many fields)_ `(admin.spec.ts)`
- ✅ **Create facility via the /admin/facilities Add modal: fill name+url+notification template,
  submit → success toast + list contains it** _(M)_ `(admin_ui.spec.ts)`
- ✅ **Cancel facility-create modal: no new facility persisted** _(M)_ `(admin_ui.spec.ts)`
- ✅ **Global admin's DB dumps page renders: the table and the create menu** — the menu is only opened; no dump is created or restored. _(E)_ `(admin_ui.spec.ts)`
- ✅ **Create user via the /admin/users Add modal: fill name+email, submit → toast + tquery
  contains the user** _(M)_ `(admin_ui.spec.ts)`
- ✅ **Create facility with duplicate URL shows unique-constraint error** — API-level. _(M)_ `(admin.spec.ts)`
- ✅ **Edit facility name; tquery reflects the change** — API-level. _(M)_ `(admin.spec.ts)`
- ✅ **Create global user; new user can log in** — API-level. _(M)_ `(admin.spec.ts)`
- ✅ **`admin/user/list` without the `in` parameter is refused (400)** — bonus. _(E)_ `(admin.spec.ts)`
- ✅ **Patch user's name; updated value returned by tquery** — bonus. _(M)_ `(admin.spec.ts)`
- ✅ **Assign user to a facility as staff; facility user tquery includes them** — API-level. _(M)_ `(admin.spec.ts)`
- ✅ **Promote a member to facilityAdmin; admin endpoint accessible afterwards (403 before)** — bonus. _(M)_ `(admin.spec.ts)`
- ✅ **Delete a member; user can still log in but facility endpoints return 403** — bonus. _(M)_ `(admin.spec.ts)`
- **Delete global user that has memberships is rejected** — not applicable: the app has no endpoint (and no UI) for deleting a global user; `routes/api.php` has only list / post / patch / tquery under `admin/user`. _(n/a)_
- **DB dumps page lists dumps and allows manual restore** — no test of its own, as restoring inside a test would clobber the snapshot stack. The dump and restore endpoints (`admin/db-dump`) are what the framework itself runs on with the `rc` target, a dump per layer and a restore per mutating test, so there they are exercised all the time as a side effect. With the `local` target the framework calls `mariadb-dump` / `mariadb` directly and the app's endpoints are not touched; most of the runs so far were on the `docker` and `local` targets. _(side effect, `rc` only)_
- ✅ **The user create form shows each validation error at its field** — the name required; the email malformed and taken; no password without an email; the password missing and too weak. Nothing is created. _(M)_ `(admin_ui.spec.ts)`
- ✅ **The users table shows the account, the roles and the facilities of each user** — the seeded users of each role and the global admin, found by the search: booleans, empty times, the list and the count of the facilities, the creator by name; sorted by the name both ways; the list column cannot be sorted by. _(M)_ `(admin_user_edit_ui.spec.ts)`
- ✅ **The export of the users table has the values of each kind as texts** — Chromium only, as all the exports. _(E)_ `(admin_user_edit_ui.spec.ts)`
- ✅ **The facilities table shows the URL, the admins and the notification template of a facility** _(E)_ `(admin_facility_edit_ui.spec.ts)`

---

## Layer: Test Facility — facility + STAFF + ADMIN + STAFF_ADMIN

Already implemented; the broad test bucket.

### Sanity / navigation

- ✅ **Logged-in STAFF sees the facility name in the header** _(E)_ `(facility.spec.ts)`
- ✅ **STAFF opening `/home` is forwarded to the calendar** _(E)_ `(facility.spec.ts)`
- ✅ **Member tquery returns the facility's four members with their roles, and besides them only the global admins and the system user; the system facility list has the facility; STAFF patching the facility gets 403** — three API tests. _(E)_ `(facility.spec.ts)`
- ✅ **Header shows the facility name when user has exactly one membership** _(E)_ `(facility.spec.ts)`
- ✅ **User-settings popover lists expected actions for each role** — STAFF, ADMIN, STAFF_ADMIN and BARE_MEMBER: change password, configure OTP, switch theme, log out; no developer controls. _(M; loop over users)_ `(facility.spec.ts)`
- ✅ **Sidebar nav items differ by role** — matrix over STAFF, ADMIN, STAFF_ADMIN and BARE_MEMBER by link `href`: staff-or-admin links (calendar, staff, clients, admins), facility-admin links (time tables, reports), and no global-admin links for any of them. _(M; loop)_ `(facility.spec.ts)`
- ✅ **Sidebar of a global admin outside any facility has the global admin links only** — bonus. _(E)_ `(facility.spec.ts)`

### Permission denials

- ✅ **STAFF navigating to `/admin/time-tables/weekly` is denied** _(M)_ `(facility.spec.ts; verifies "no_permissions_to_view" fallback)`
- ✅ **STAFF API delete client returns 403** — implemented in the Clients layer where a real client id exists. _(E)_ `(clients.spec.ts)`
- ✅ **Developer and global admin endpoints: 401 for anonymous, 403 for every facility role; developer endpoints 403 for a global admin without the developer permission** — `admin/developer/migrate` (status only), `admin/developer/log/tquery`, `admin/db-dump/tquery`, `admin/user/tquery`, `admin/facility/tquery`; `mail/test` and `system/log` for anonymous only. No call that would change anything if let through (`overwrite-metadata`, `patch-staff`, dump create / restore are not sent). _(E)_ `(closed_endpoints.spec.ts)`
- ✅ **A log entry with no content is refused** _(E)_ `(closed_endpoints.spec.ts)`
- ✅ **The endpoints of clients, client groups, staff and members are for facility staff and admins only** — in the Test Clients layer: the lists, the table queries and their column lists, and the writes (of a client, of a staff member and of an admin; the creation of a client group and its assigning to attendants), asked by a member with no role (403) and by a caller who is not logged in (401), with nothing changed; a staff member and an admin who is not staff can read them all. _(M)_ `(clients.spec.ts)`
- ✅ **Non-member trying to access another facility's URL gets denied** — in the Second Facility layer. API: 403 on the other facility's endpoints, and `user/status/{otherFacility}` reports no facility permissions. UI: `no_permissions_to_view` on the other facility's pages (`calendar`, `home`, `admin/time-tables`) with the URL left as it is, nothing of the other facility shown, the header and the sidebar still on the user's own facility. _(M)_ `(multi_facility.spec.ts)`
- ✅ **Nonexistent facility URL gets not-found, not a denial** — bonus. _(E)_ `(multi_facility.spec.ts)`
- ✅ **Global admin who is not a facility member is denied on facility URLs** — bonus; the backend grants no facility permissions without a member entry, and the UI follows. _(E)_ `(multi_facility.spec.ts)`

### Multiple facilities

The Second Facility layer (parent: Test Facility; `layers/second_facility.ts`) adds a second facility with STAFF_ADMIN as its only member (active staff, not an admin there).

- ✅ **Active facility selector appears when user is member of ≥2 facilities** — lists both facilities, sorted by name; the single-facility user gets plain text instead (asserted in the non-member test). _(M)_ `(multi_facility.spec.ts)`
- ✅ **Switching facilities reloads onto the new facility's URL** — also checks that `lastLoginFacilityId` follows, and that `/` then leads to the newly chosen facility. _(M)_ `(multi_facility.spec.ts)`
- ✅ **Opening the other facility's URL directly makes it the active facility** — bonus; the selector, the sidebar (no admin section: not an admin there) and `lastLoginFacilityId` follow the URL. _(M)_ `(multi_facility.spec.ts)`
- ✅ **Permissions follow the facility in the URL** — bonus; STAFF_ADMIN (admin in the first facility only) gets `no_permissions_to_view` on the other facility's admin page, and its calendar normally. _(E)_ `(multi_facility.spec.ts)`
- ✅ **Client / staff details of an unknown id, or of a user of another kind, show "resource not found"** — a staff member's id under `clients/`, a bare member's under `staff/`; the header and the menu stay. _(E)_ `(not_found_ui.spec.ts)`
- ✅ **A client of the other facility is not found under this facility's URL** — for a member of both facilities and for a member of this one only; the name is not on the page. _(M)_ `(not_found_ui.spec.ts)`
- ✅ **An unknown page is not found, with its path named** — in a facility, under a client, under the facility admin's pages (where a user who is not one gets the denial instead) and under the global admin's pages. _(E)_ `(not_found_ui.spec.ts)`
- ✅ **The paths that only lead on** — a link that names no facility (`/__facility/…`, as the help pages have them) leads to the facility of the user; the root of a facility to its calendar; the roots of the technicals pages, of a facility and of the global admin, to the attributes. _(E)_ `(not_found_ui.spec.ts)`
- ✅ **Client details of a malformed (non-UUID) id are not found** — the id is recognised in the frontend, with no request sent. _(E)_ `(not_found_ui.spec.ts)`

### User panel

- **Change password as STAFF then re-login succeeds with new password** — same as Layer 0 variant but inside facility context. Probably skip — covered at Layer 0. _(—)_
- **Configure OTP as STAFF; subsequent login requires OTP** — covered at Layer 0 (`otp.spec.ts`), on a user with no facility; nothing in it depends on the facility. _(—)_
- ✅ **Theme toggle persists across reloads** — dark on, reload, dark off, reload. _(E)_ `(facility.spec.ts)`
- ✅ **User storage (`user/storage`): put, get, list, overwrite, remove with null; another user sees none of it** — in the Second Facility layer. _(E)_ `(user_storage.spec.ts)`
- ✅ **User storage and `PATCH /user` answer 401 to an anonymous request** _(E)_ `(user_storage.spec.ts)`
- ✅ **`PATCH /user` refuses a `lastLoginFacilityId` that is not a facility** _(E)_ `(user_storage.spec.ts)`
- ✅ **`PATCH /user` refuses a facility the user is not a member of** _(E)_ `(user_storage.spec.ts)`
- ✅ **Password about to expire: no prompt a month ahead, a dismissible suggestion two weeks ahead, a forced form (log out only) three days ahead; an expired password does not log in** — one test, the expiry set by the global admin on STAFF. _(M)_ `(password_expiry_ui.spec.ts)`
- ✅ **The forced password change form logs out, or changes the password and lets the user in** — the form is used while the calendar under it is still loading, so the test also guards the session race fixed in the app (an earlier request finishing later and writing the old session back). _(M)_ `(password_expiry_ui.spec.ts)`

### Translations

- ✅ **Switching to the testing language reflects across all visible labels** — smoke on the sidebar and the user-settings popover: no key shows through in the default language, every facility link reads `routes.facility.*` after the switch. _(E)_ `(facility.spec.ts)`
- **Missing-key fallback shows `??key` in dev mode** — dev-only; might skip in non-dev. No place in the UI is known to use a missing key, so there is nothing stable to assert on. _(M)_
- ✅ **The calendar, a meeting and the client form are in Polish** — a smoke test of the real translations, which no other test sees: a few known texts (a button, a heading, a plural with its number, a validation error naming its field), and on each page no key and no unfilled `{{parameter}}` showing through. Layer: Test Meetings. _(E)_ `(translations_ui.spec.ts)`

### Facility admin: staff management

- ✅ **ADMIN sets STAFF.deactivatedAt; staff/list reflects it** _(M)_ `(staff.spec.ts)`
- ✅ **ADMIN deactivates STAFF via the staff details UI: untick isActive → deactivatedAt field
  appears → fill → save → toast + API confirms** _(M)_ `(staff_ui.spec.ts)`
- ✅ **Plain STAFF visiting staff details does NOT see an Edit button** _(M)_ `(staff_ui.spec.ts)`
- ✅ **ADMIN clears STAFF.deactivatedAt; staff is active again** _(M)_ `(staff.spec.ts)`
- ✅ **A deactivated STAFF loses access but stays on past meetings** — in the Test Meetings layer, three ways: `deactivatedAt`, an unverified email (no facility access), no password (no login). _(M)_ `(deactivate_staff.spec.ts)`
- ✅ **ADMIN promotes STAFF to facilityAdmin; STAFF can now hit the admin-only patch endpoint** _(M)_
  `(staff.spec.ts)`
- ✅ **ADMIN gives STAFF the facility admin role in the staff details form; STAFF's menu gets the admin section** — two browser contexts; the globally managed user's own data is not editable there. _(M)_ `(staff_ui.spec.ts)`
- ✅ **STAFF (non-admin) PATCH on another staff returns 403** — covers permission boundary on
  `/user/staff/{id}`. _(M)_ `(staff.spec.ts)`
- ✅ **Facility admin patching a globally-managed staff's `name` is rejected (field=name,
  rule=missing)** — covers StaffController:124-126. _(M)_ `(staff.spec.ts)`
- ✅ **staff/list returns the seeded STAFF and STAFF_ADMIN; bare member excluded** _(E)_
  `(staff.spec.ts)`
- ✅ **ADMIN sees the staff page rendering with a known staff name** _(E)_ `(staff.spec.ts)`
- ✅ **The staff list has STAFF and STAFF_ADMIN only, each row linking to the details; no "show inactive" box for a non-admin** _(E)_ `(staff_ui.spec.ts)`
- ✅ **A deactivated staff member is on the list only with "show inactive" ticked** — the admin's checkbox under the table. _(M)_ `(staff_ui.spec.ts)`
- ✅ **The staff table has the columns of the account for an admin only, and a value in each column** — a staff member who is not an admin is not offered the columns of the email verification, the password, the OTP, the managing facility, the failed logins and the activity; an admin sees them, with the booleans, the empty times, the counts and the creator of the two staff members. The test of the deactivated staff member also reads the columns of the activity. _(M)_ `(staff_ui.spec.ts)`
- ✅ **The columns of the account that the pages keep for admins are given to any staff member** — API; pins what the server does, see the app problems. _(E)_ `(staff.spec.ts)`
- ✅ **Table saved views: save a view with a search, load the default one, load the saved one after a reload, delete it** — on the staff list; the views are kept server-side in `user/storage`, so the test checks the stored entry too. Not covered: the advanced view, rename / duplicate / overwrite, view codes. _(M)_ `(staff_ui.spec.ts)`
- ✅ **A deactivated staff member is shown as inactive, and is activated again in the form** — the label with the time of deactivation on the details page; the form starts from that time. _(E)_ `(staff_ui.spec.ts)`
- ✅ **An admin edits the name, the password with its expiry and the roles of a staff member managed by the facility** — the user's own fields in the staff details form: a new name and password (the old one stops working), the expiry given in days, a required OTP with its week of grace, the admin role; without a password the admin role is taken away and cannot be given. _(M)_ `(staff_ui.spec.ts)`
- **ADMIN edits a custom staff attribute** — not applicable: custom attributes exist only for clients, dictionaries and positions (`AttributeTable::valueCapable()`); creating one for `staffMember` is rejected, which `technicals.spec.ts` asserts. _(n/a)_

### Facility admin: facility admins

- ✅ **STAFF_ADMIN demotes ADMIN via `/user/admin`; ADMIN loses facility-admin access** _(M)_
  `(staff.spec.ts)`
- ✅ **ADMIN can change other admin's email and force password reset (managed-by-facility only)** — API-level: email + password of a facility-managed admin created in the test; the new credentials log in. _(M)_ `(facility_admins.spec.ts)`
- ✅ **Facility admin patching a globally-managed admin's `email` is rejected (field=email, code=validation.missing)** — bonus. _(M)_ `(facility_admins.spec.ts)`
- ✅ **The admins page lists ADMIN and STAFF_ADMIN, not STAFF nor the bare member** _(E)_ `(facility_admins_ui.spec.ts)`
- ✅ **The admins table is read-only for a staff member, and has a value in each column for an admin** — no edit buttons and no columns of the account for a staff member who is not an admin; the cells of both admins for an admin. The test of the managed admin also reads who manages the admin, and that a changed email is not verified. _(M)_ `(facility_admins_ui.spec.ts)`
- ✅ **Admin edit modal of a globally managed admin: only the admin role is editable; cancel changes nothing** _(E)_ `(facility_admins_ui.spec.ts)`
- ✅ **Unticking the admin role of an admin who is not staff shows the warning; of a staff member it does not** _(E)_ `(facility_admins_ui.spec.ts)`
- ✅ **An admin takes the admin role from another admin in the modal** — she stays a staff member and leaves the list. _(M)_ `(facility_admins_ui.spec.ts)`
- ✅ **An admin edits the name and the email of an admin managed by the facility** _(M)_ `(facility_admins_ui.spec.ts)`
- ✅ **The name and the email of a managed admin are validated in the modal** — the name required, the email malformed and taken by another user. _(M)_ `(facility_admins_ui.spec.ts)`

### Facility admin: dictionaries / attributes / positions

Runs in the Test Technicals layer (parent: Test Clients; `layers/technicals.ts`), which adds: a facility dictionary "E2E Colours" with positions Red / Green / Blue, an empty facility dictionary, three facility client attributes (multi-value dict over the colours, a string "nickname", an unused string), one client (Adam Kowalski) with colours = [Red] and a nickname, and a second facility owning one dictionary with one position (for the scoping tests).

- ✅ **Create a custom dictionary entry; it appears in attribute selectors** — a position added through the API is offered in the client form's select of the dict attribute; staff picks it and edits the string attribute too. _(M)_ `(technicals_ui.spec.ts)`
- ✅ **Create a custom attribute; it appears on client edit form** — created through the attributes page form, then filled in on the client details page. _(M)_ `(technicals_ui.spec.ts)`
- **Create a position; appears on staff form** — not applicable: the staff form has no dictionary or attribute fields. Custom meeting types (positions of `meetingType`) are covered by the meetings layers. _(n/a)_

API (`technicals.spec.ts`):

- ✅ **Seeded dictionaries and attributes are listed with their scope and order** _(E)_
- ✅ **Technicals tquery endpoints (dictionary / position / attribute) return the seeded rows** _(E)_
- ✅ **The lists of dictionaries and of attributes are given to anyone, with those of every facility** — pins what the server does, see the app problems; the table queries and the list of the facilities need a login. _(E)_
- ✅ **Admin endpoints are closed to non-admins** — staff and bare member get 403 on the facility ones, a facility admin 403 on the global ones, anonymous 401; nothing changes. _(M)_
- ✅ **Facility admin creates, renames and deletes a dictionary** — the facility endpoint forces the facility scope, non-fixed, extendable. _(M)_
- ✅ **Dictionary names are unique within the facility's visibility scope** — own and global names taken, a bare "+" rejected, renaming to the current name allowed. _(M)_
- ✅ **A dictionary name may repeat the name of another facility's dictionary** _(E)_
- ✅ **A dictionary with positions or used by an attribute cannot be deleted** — one dictionary that is both; the attribute-only case is the next entry. _(E)_
- ✅ **A dictionary used only by an attribute cannot be deleted until the attribute is gone** _(M)_
- ✅ **Facility admin cannot touch global or other facilities' dictionaries, positions, attributes (404)** _(M)_
- ✅ **Fixed technicals are not editable even by the global admin; `isFixed` cannot be set** _(M)_
- ✅ **New positions are appended, or inserted at the requested order** — also clamping of an order past the end, and `defaultOrder: 0` rejected. _(M)_
- ✅ **Patching a position renames, disables and reorders it** — up, down, past the end; `dictionaryId` immutable. _(M)_
- ✅ **Deleting a position closes the gap in the order; a referenced one cannot be deleted** _(M)_
- ✅ **A position cannot be added to a non-extendable, a foreign or an unknown dictionary** _(M)_
- ✅ **Facility admin creates attributes; api names are validated** — unique, reserved (column name), regex; dict type ⇔ dictionary; foreign dictionary; only value-capable models. _(M)_
- ✅ **Patching an attribute** — editable fields, immutable fields, no escalation to `required`, reorder keeps the shared order sequence intact. _(M)_
- ✅ **An attribute with values cannot be deleted; an unused one can** _(M)_
- ✅ **Custom attribute values are stored on a client and validated** — the "Edit a custom attribute (multi-value)" entry of the clients section; also filtering by the value in the clients tquery. _(M)_
- ✅ **A dictionary can require an attribute on its positions** — `positionRequiredAttributeIds`: refused while positions lack the value, then enforced on create and patch, and the attribute becomes undeletable. _(M)_
- ✅ **Global admin manages a global dictionary that facilities extend** — extendability toggle, facility positions next to global ones, `is_extended` and `in_use` guards, facility dictionaries must be extendable. _(M)_

UI (`technicals_ui.spec.ts`):

- ✅ **Dictionaries page lists the facility's and the global dictionaries; actions only on own rows** _(E)_
- ✅ **Technicals pages are for facility admins only** _(E)_
- ✅ **Global admin's technicals pages list the rows of all the facilities** _(E)_
- ✅ **Create a dictionary and its first position via the forms** _(M)_
- ✅ **Dictionary create form reports a taken name** _(E)_
- ✅ **Rename a dictionary, delete an empty one; delete of a used one is refused with a toast** _(M)_
- ✅ **Edit, insert (before a chosen position) and delete positions on the dictionary page** _(M)_
- ✅ **Reorder positions by dragging in the reorder dialog** _(M)_
- ✅ **Rename an attribute, delete an unused one; delete of a used one is refused** _(M)_
- ✅ **Create a multi-value dictionary attribute at a chosen place in the order** — type, dictionary, multi-value, requirement level and "insert before" set in the form. _(M)_
- ✅ **Reorder attributes by dragging in the reorder dialog** — only the facility's own attributes are draggable among the global ones. _(M)_

- ✅ **Advanced view shows the api name and the metadata of an attribute, in every technicals form** — the switch, the api name following the name until edited, the choice kept for the dictionary form (required attributes). _(M)_
- ✅ **A position attribute is filled in on the position form, and then required by the dictionary** — the value in the edit form, the requirement set in the advanced view of the dictionary form, a new position refused without the value. _(M)_
- ✅ **Global admin creates a global dictionary and one of a facility, with the forms always advanced** — the facility selector, the extendability checkbox (global dictionaries only), no switch; the facility of a dictionary cannot be changed. _(M)_
- ✅ **Global admin creates an attribute of a facility, with its api name** _(E)_
- ✅ **The description and the metadata of an attribute take effect in the client form** — set in the attribute form: a separator whose group starts folded (and has no requirement level), a `string` attribute with an explanation and a multi-line field, both of which are cleared again in its edit form. _(M)_
- ✅ **Global admin adds a global position and one of a facility to a global dictionary** — the facility selector of the position form, a position created disabled; the facility of a position cannot be changed. _(E)_
- ✅ **An attribute and a dictionary of another facility are not on this facility's pages** — the client form, the column chooser of the clients table, the attributes page, the dictionaries offered by the attribute form. _(M)_

Not covered yet: the position attributes in the global admin's position form (editable only for a position of a facility).

### Values of attributes, by type and by requirement level

Runs in the Attribute Values layer (parent: Test Clients; `layers/attribute_values.ts`), which adds a facility dictionary "E2E Sizes" (Small / Medium / Large) and fourteen facility client attributes: two separators, a single-value attribute of each type the attributes page offers (`bool`, `date`, `datetime`, `int`, `string`, `text`, `dict`), lists of `string`, `int`, `date` and `dict`, and among them every requirement level (the `string`, the `dict` and the `dict` list are required, the `date` recommended, one more `string` is of the level `empty`). Adam has a value of every attribute, Bea the required ones only, and the other eight clients none — as clients made before the attributes were. The attributes of the types the page does not offer (`users`, `clients`, `attributes`, and lists of `bool`, `datetime`, `text`) are made in the tests that need them.

Four of the tests state what the app should do and does not. Each first asserts the symptom of the problem, then calls `test.fail` right before the one assertion that cannot hold: so it is run, is expected to fail there, and is reported as passed (with a ✘ in the list) until the app is fixed — when the symptom is gone, it fails for real, and the mark has to go. Their entries have no ✅. The problems are in the list at the end.

API (`attribute_values.spec.ts`):

- ✅ **A client value of each attribute type is stored and read back** — returned by the client endpoint (which leaves out what has no value) and by the tquery (null, or an empty list); the type of each column, none for a separator. _(M)_
- ✅ **A client is created with a value of each type; the values are changed and cleared** — a `false` and a `0` are values, not the lack of one; a negative number; a `text` of 4000 characters; a patch of one value leaves the others; cleared with `null`, an empty text or an empty list. _(M)_
- ✅ **A value of the wrong type is refused, for each type** — the exact error of some forty values: a text for a `bool` or an `int`, a number in a string, an impossible date, a time not in UTC, a `string` over 250 and a `text` over 4000 characters, an untrimmed text, a position of another dictionary, a list where one value is expected and the reverse, a bad element of a list (the error names its index), a value for a separator, an unknown name. _(M)_
- **An integer too large to store is refused** — expected to fail (`test.fail`): the app answers with a 500, the insert into the 32-bit column failing with nothing having checked the range. _(E)_
- ✅ **A required attribute is required, on create and when cleared** — missing: `validation.present`; null or an empty text: `validation.required`; an empty required list: `validation.min.array`. _(M)_
- ✅ **The other requirement levels take no value, and any value** — a client is created with the required values only; a client from before the required attributes is patched without them, but not with them sent empty; an attribute of the level `empty` takes a value like any other (the level is a matter of the form only). _(M)_
- ✅ **A list of values keeps its order and its repeats** — also of dictionary positions; the count columns. _(E)_
- ✅ **Clients are filtered and sorted by the values of each type** — the operators each type takes; a list of texts is searched as a text; "no value" for every nullable column. Refused: any question but "is it empty" about a list of numbers or dates, and "is it empty" about a required attribute — so the clients lacking a required value cannot be listed. _(M)_
- ✅ **Attributes referring to users and to attributes take any row of the table** — `users` (single and list) and `attributes`: stored, read back, an id of another table refused; a user is not checked to be of the facility; a `clients` attribute wants the id of the `clients` row, which the API never gives (a client is known by its user's id), so it cannot be given a value; an attribute referred to cannot be deleted. _(M)_
- ✅ **Lists of booleans, of times and of long texts are stored** — the tquery gives the booleans as `1` / `0` and the times as `Y-m-d H:i:s`, unlike those of a single value. _(E)_
- ✅ **An attribute of another facility is not a field of this facility's clients** — refused as an unknown name, no tquery column; but its api name is taken for every facility. _(M)_
- ✅ **A required attribute is made optional; a position with values is disabled, not deleted** — the "Changing an attribute that already has values" entry, as far as the app allows changes: the level is lowered (the column turns nullable, the value can be cleared) and cannot be raised back; a position that is a value cannot be deleted; a disabled one stays, and can still be given. The type and the multi-value flag are immutable (tested in `technicals.spec.ts`). _(M)_
- ✅ **Positions hold attribute values of each type** — `bool`, `date`, `int`, `text`, `dict` and a list of `string`, set on create and on patch, cleared, refused when of the wrong type; a required position attribute is required of the new positions of every dictionary of the facility, the global ones it extends (meeting types) included. _(M)_

UI (`attribute_values_ui.spec.ts`):

- ✅ **Client details show the value of each type, and hide the empty optional ones** — formatted (a date with its weekday, a time in the browser's time zone, a position by its name, a list in a line); in the order of the attributes, under the headings of the separators, each with the mark of its level; the empty recommended and required ones shown with a dash, the optional and `empty` ones folded. _(M)_
- ✅ **The client create form has a control for each type, and saves the values** — checkbox, date, number, one-line and multi-line text, select, multiple select, a list of inputs with "add"; no control for a `datetime`; the attribute of the level `empty` not offered; the details page then shows what was entered. _(M)_
- ✅ **A required attribute left empty blocks the save, with the error at its field; the others do not** — in the edit form of a client from before the attributes (who therefore cannot be saved until the values are given), and in the create form, which goes through with the recommended and optional ones empty. _(M)_
- ✅ **The values of each type are changed and cleared in the edit form** — the form starts from the values; a value of a list removed, one added. _(M)_
- ✅ **An edit of another field leaves the empty attributes empty, but for a checkbox** — which is saved as a "no" once the form is submitted (the create form does the same). _(E)_
- ✅ **The number field takes an integer only** — `1.5` is refused by the server, with the error at the field; so is a too long `string`. _(E)_
- ✅ **The clients table has a column for each attribute, with the values formatted** — the columns are hidden until ticked in the column chooser; the cells of a client with every value, with the required ones and with none; sorting by a value. _(M)_
- ✅ **The export of the clients table has the attribute columns shown**; **the export of a single client has a line for each attribute** — Chromium only, as all the exports. _(E)_
- ✅ **The column of an attribute has a filter for its type, but for a list of numbers or dates** — in the clients table: yes / no / any value / no value of a checkbox; a range of days of a date and of a time; a range of a number and of the length of a list; a part or the whole of a text, and "no value"; any of the chosen positions; all, any, exactly or only the chosen positions of a list (a client with none has "only" them too); several filters together, cleared with one button. _(M)_
- ✅ **The tables of the attributes, the dictionaries and the positions describe each of the layer's** — the type (with the dictionary), the multi-value flag, the requirement level and the order of each attribute, next to an attribute of the app; the dictionary with the count of its positions; its positions in their order. _(M)_
- ✅ **The client details, the create form and the column chooser follow a changed order of the attributes** _(E)_
- ✅ **An attribute referring to a user has no control and shows no value** — the rest of the form works, and the value stays. _(E)_
- ✅ **The position form has a control for each type of position attribute** — `bool`, `int`, `date`, `text` and `dict`, each filled in and saved. _(E)_
- **A client with a time value is saved in the edit form** — expected to fail (`test.fail`): the form sends the time back with the microseconds it got it with, the server takes whole seconds only, and the save ends with `validation.date_format` at a field that has no control. _(E)_
- **The client form opens in a facility with a list-of-booleans attribute** — expected to fail (`test.fail`): the form throws "Unsupported multiple attribute of type bool", and the page is left blank. _(E)_
- **A client keeps the values whose dictionary positions were disabled since, through an edit** — expected to fail (`test.fail`): the details still show the values, but the selects of the edit form leave the disabled positions out, so the form opens with the required value empty (nothing can be saved until another one is chosen) and a save takes the disabled position off the list. _(M)_

Not written:

- **Dictionary attributes** — dictionaries can hold values too; only `positionRequiredAttributeIds` (a fixed one) is tested.

### Global admin operations inside an existing facility

- ✅ **Global admin renames a staff user via `/admin/user/{id}`; facility staff/list reflects the
  new name** — covers the only path to rename a globally-managed user. _(M)_ `(staff.spec.ts)`
- ✅ **Edit facility URL; old URL 404s, new URL works** — the old URL shows the not-found page, the new one the facility, and `/` redirects to the new URL. _(M)_ `(facility.spec.ts)`
- ✅ **Global admin's user edit modal: rename, change the roles of a membership** — the staff and active staff boxes follow each other; found through the search of the paged users list. _(M)_ `(admin_user_edit_ui.spec.ts)`
- ✅ **User edit modal: add a membership in another facility, with roles** — the facility is created in the test; the user's own facility is not offered. _(M)_ `(admin_user_edit_ui.spec.ts)`
- ✅ **User edit modal: remove a staff membership, past the destructive-update warning** _(M)_ `(admin_user_edit_ui.spec.ts)`
- ✅ **The global admin cannot take the global admin role from themselves** — the form shows the error and sends nothing. _(E)_ `(admin_user_edit_ui.spec.ts)`
- ✅ **Facility edit modal: rename and change the URL**. _(E)_ `(admin_facility_edit_ui.spec.ts)`
- ✅ **Facility edit modal: a URL taken by another facility is refused, the form stays open for a correction** _(E)_ `(admin_facility_edit_ui.spec.ts)`
- ✅ **The global admin creates a user with every field of the form; the user logs in** — the email verified, a password, its expiry (a week by default; the days and the date follow each other), a required OTP (a week by default), a membership with a role, the managing facility, the global admin role; nothing that needs an email or a password can be set before them. _(M)_ `(admin_user_edit_ui.spec.ts)`
- ✅ **The global admin takes the password expiry, the OTP requirement, the password and the email from a user** — in four saves of the edit modal: the expiry cleared with its button and the OTP box unticked (the password, left empty, stays); a changed email is not verified any more; without the password the user cannot log in; without the email there is nothing to verify and no password to give. _(M)_ `(admin_user_edit_ui.spec.ts)`
- ✅ **Facility edit modal: the notification template is set, and cleared again** _(E)_ `(admin_facility_edit_ui.spec.ts)`
- ✅ **The facility create form proposes a URL made from the name, until another one is typed** — lower case, no diacritics, dashes; the facility is created with no notification template. _(E)_ `(admin_facility_edit_ui.spec.ts)`
- **Delete facility (if endpoint exists) — purges all members/clients/meetings** _(H; potentially destructive; skip unless specifically supported)_
- ✅ **The facility create form shows each validation error at its field** — the name and the URL required, the name too long; the URL reserved, with capitals, too short, with other characters, starting with a digit, too long, taken; an unknown parameter in the notification subject. Nothing is created. _(M)_ `(admin_facility_edit_ui.spec.ts)`

---

## Layer: Test Clients (parent: Test Facility)

Setup adds 10 clients (5 adults, 5 children) with varied attributes — surnames split them across three families (Kowalski / Nowak / Wisniewski) so groups can be built by surname. Each seed populates a different subset of optional fields (birthDate, gender, contactEmail, contactPhone, addressCity, notes) so client_tquery / clients-table tests can verify variety end-to-end.

### Clients list

- ✅ **List shows seeded clients with name, short code** — name verified via UI; tquery asserts presence; shortCode asserted via `user/client/list`. _(E)_ `(clients.spec.ts)`
- ✅ **Filter clients by name substring updates the list** — implemented as a `%v%` tquery filter narrowing to "Adam". _(M; tquery driven)_ `(clients.spec.ts)`
- ✅ **Sort clients by name asc/desc** — tquery sort in both directions; in the UI by clicking the column header. _(M)_ `(clients.spec.ts, clients_ui.spec.ts)`
- **Pagination: 100+ clients (override setup to seed many) — out of scope for default layer** _(H; alternate setup)_
- ✅ **Export to CSV produces a file** — the export goes through `showSaveFilePicker`, not a download; the test substitutes a picker collecting the written bytes, and checks the header line and one line per client. _(M)_ `(clients_ui.spec.ts)`

### Client creation

- ✅ **STAFF creates a client via API; appears in list with assigned short code** _(M)_ `(clients.spec.ts)`
- ✅ **STAFF creates a client via the /clients/create UI form** _(M)_ `(clients_ui.spec.ts)`
- ✅ **Creating a client without typeDictId is rejected (field=client.typeDictId)** _(M)_ `(clients.spec.ts)`
- ✅ **Create client missing required field shows validation per-field (full matrix)** — API: name, client part, type / gender / notification method from a wrong dictionary, impossible birth date. `contactEmail` is not in the matrix: the backend accepts any string there. _(M)_ `(clients.spec.ts)`
- **Two concurrent client creates produce two distinct short codes** _(H; concurrency)_
- ✅ **The client form shows each validation error at its field** — the name and the type required; the short code not a number, too long, taken (also with a leading zero); a text too long; the name, the notes and a value of each list (urgent notes, links to documents) too long, the error naming the value's place in the list, while a value added to a list and left empty is no error. Nothing is created. _(M)_ `(clients_ui.spec.ts)`
- ✅ **A client created with the name and the type only has nothing else but the start date** — which the form fills in with today; the next short code is given; the details show a dash for each recommended field and fold the optional ones away; the row of the clients table, with the columns of all the fields shown, is empty but for these. _(M)_ `(clients_ui.spec.ts)`
- ✅ **A client created with every field of the form has each of them** — the short code given by hand, type, gender, two urgent notes (one of low priority), birth date, email, phone, the three address fields, both contact dates, two links to documents, the SMS notification method, notes of two lines; read back from the server, on the details page (the age after the birth date, the phone number without the country's prefix, the links as links) and in the row of the clients table. _(M)_ `(clients_ui.spec.ts)`
- ✅ **Each optional field of a client is cleared in the edit form** — the form starts from the values of a client that has all of them; the texts and the dates are emptied, the selects cleared with their buttons (the required type has none), the values of the lists removed; the server then has the short code and the type only, and the details are as of a client created with nothing. _(M)_ `(clients_ui.spec.ts)`
- **Whether the form differs by the client type (adult / child)** — not applicable: it does not; nothing in the client form looks at the type (it matters only in the client group form, where a child needs no role). _(n/a)_

### Client details / edit

- ✅ **Open client details; all seeded fields visible** — name in `clients.spec.ts`; type, gender, birth date, phone, email, city and notes of four clients in `clients_ui.spec.ts` (dates as the browser's locale shows them). _(E)_ `(clients.spec.ts, clients_ui.spec.ts)`
- ✅ **A single client exports to CSV from the details page** — one field per line; the save-picker stub is now `helpers/saved_file.ts`. _(E)_ `(clients_ui.spec.ts)`
- ✅ **Clicking a client in the list navigates to /clients/{id}** _(E)_ `(clients_ui.spec.ts)`
- ✅ **Edit name via UI: click Edit button → name input appears → save → tquery reflects** _(M)_ `(clients_ui.spec.ts)`
- ✅ **Cancel edit: input disappears, original name retained** _(M)_ `(clients_ui.spec.ts)`
- ✅ **Edit name and birth date; persists after reload** — API path; UI variant covered above. _(M)_ `(clients.spec.ts)`
- ✅ **Edit multiple client fields at once (notes + contactEmail + addressCity)** — _(M)_ `(clients.spec.ts)`
- ✅ **Set and then clear birthDate via successive PATCHes** — covers nullable round-trip. _(M)_ `(clients.spec.ts)`
- ✅ **Invalid birthDate is rejected (field=client.birthDate)** — _(E)_ `(clients.spec.ts)`
- ✅ **Rename a facility-managed client (managedByFacility path is allowed)** — _(M)_ `(clients.spec.ts)`
- ✅ **Edit a custom attribute (multi-value)** — in the Test Technicals layer, through the API and through the client details form. _(M)_ `(technicals.spec.ts, technicals_ui.spec.ts)`

### Client delete

- ✅ **STAFF tries to delete client → button hidden / API 403** — API-level. _(E)_ `(clients.spec.ts)`
- ✅ **ADMIN deletes a client; tquery total drops by one** — soft-delete-reason / deleted-view variants left. _(M)_ `(clients.spec.ts)`
- ✅ **ADMIN cannot delete a client that's referenced by meetings unless cascade is supported** — in the Test Meetings layer: the delete needs `duplicateOf`, and that client then takes over the meetings. _(M)_ `(client_delete.spec.ts)`
- ✅ **Deleting a duplicate attending the same meeting does not double the attendant** — bonus. _(M)_ `(client_delete.spec.ts)`
- ✅ **ADMIN deletes a client with no meetings in the delete modal** — in the Test Meetings layer; the duplicate-of client is optional, the page goes back to the clients list. _(M)_ `(client_delete_ui.spec.ts)`
- ✅ **A client with meetings is deleted in the modal as a duplicate** — the form demands the other client and refuses the client themselves; the meeting moves, the page goes to the other client. The form demands the other client from the start only if the page had the meetings counted when the modal was opened, so the test waits for the count. _(M)_ `(client_delete_ui.spec.ts)`
- ✅ **Cancelling the delete modal keeps the client; STAFF has no delete button** _(E)_ `(client_delete_ui.spec.ts)`

### Client groups

The Test Client Groups layer (parent: Test Clients) seeds three groups:

- **familyGroup** — Kowalski family: 2 adults (Adam, Bea) + 2 children (Zoe, Will).
- **pairGroup** — Nowak: 1 adult (Carl) + 1 child (Yara).
- **mixedGroup** — adult Adam Kowalski (also in familyGroup) + 2 Wisniewski children. Demonstrates that an adult can belong to multiple groups and surnames don't have to match.

- ✅ **The three seeded groups are returned by `client-group/list`** — the groups are created by the layer setup through the API; a second test reads the groups and their clients back and checks the members of each by name and type (an adult in two groups, children of another surname). _(M)_ `(client_groups.spec.ts)`
- ✅ **Edit group name; reflected in list** — implemented as `notes` edit via API. _(M)_ `(client_groups.spec.ts)`
- ✅ **Delete group — clients are not deleted** — group delete tested; "clients still exist" check left for future. _(M)_ `(client_groups.spec.ts)`
- ✅ **Client tquery exposes group membership for the seeded clients** — bonus. _(M)_ `(client_groups.spec.ts)`
- ✅ **Staff attaches a third client to the group via patch** — bonus. _(M)_ `(client_groups.spec.ts)`
- ✅ **Create client group via UI modal: open from client details, fill notes, submit → toast +
  group exists** _(M)_ `(client_groups_ui.spec.ts)`
- ✅ **Cancel client-group create modal: no new group persisted** _(M)_ `(client_groups_ui.spec.ts)`
- ✅ **Edit a group in the modal: notes, a member's role, one member replaced** — the client whose page it is cannot be removed. _(M)_ `(client_groups_ui.spec.ts)`
- ✅ **Delete a group through the confirmation (cancel first); its clients stay, in no group** _(M)_ `(client_groups_ui.spec.ts)`
- ✅ **Remove the current client from one of their two groups, chosen in the group selector** — the other group is untouched. _(M)_ `(client_groups_ui.spec.ts)`
- ✅ **Add a client to an existing group, found by one of its members** — the button is disabled until a group is found; the client themselves is refused; a member of no group switches the form to creating a group. _(M)_ `(client_groups_ui.spec.ts)`
- ✅ **A group is created with several members, each with a role, and no notes; the roles are then cleared** — a role typed, a role picked from the list of the roles (the positions of a dictionary, one added in the test), a child, whose field says that no role is needed; the page of the client then shows the members with their roles; in the edit form the notes are added and the roles taken away, one with the "no role" item of the list. _(M)_ `(client_groups_ui.spec.ts)`
- ✅ **The clients table counts the groups of a client, and lists the members of the groups** — the other members of all the groups of the client, by name, one of them followed as the link to that client that it is; a dash for a client in no group. The roles are all empty in the layer. _(E)_ `(client_groups_ui.spec.ts)`
- **Bulk-assign notification method to all members of a group** — needs Test Meetings + group on attendants. _(H)_

### Notifications (admin)

- ✅ **ADMIN views the notifications tquery page** — in the Test Facility layer (no notifications exist): tabs, columns, empty summary. _(E)_ `(notifications.spec.ts)`
- ✅ **Notifications tquery is open to facility admins only** — bonus; staff gets 403. _(E)_ `(notifications.spec.ts)`
- **Set notification method on a client; reflected in meeting attendants** — see the Test Notifications layer. _(H)_

---

## Layer: Test Meetings (parent: Test Clients) + Test Meetings with Groups (parent: Test Client Groups)

The meetings setup is extracted into a shared `setupMeetings(api, parent)` function and reused by two layers:

- `meetingsLayer` (parent: Test Clients) — meetings on top of clients, no groups in scope.
- `meetingsWithGroupsLayer` (parent: Test Client Groups) — meetings on top of clients + the seeded group, used by cross-feature tests in `meetings_with_groups.spec.ts`.

Both seed:

- 3 single-client meetings (past completed, today planned, future planned) on the built-in `meetingType.other`.
- A multi-attendant **groupMeeting** (2 staff + 3 clients, 90 min) on a custom type ("Integration Test Therapy", category=other).
- A short **shortMeeting** (1 staff + 1 client, 30 min) on a custom type ("Integration Test Consult", category=system).

The two custom types are added inside the layer setup via `POST /facility/{id}/admin/position` against the (fixed but extendable) `meetingType` dictionary, with their Category attribute pointing at a `meetingCategory` position.

### Calendar

- ✅ **STAFF sees today's meetings on the calendar** — the blocks of the seeded meetings in the views of the calendar. _(M)_ `(calendar_ui.spec.ts)`
- ✅ **Switch calendar view to week/month** — day, week and month views of one staff member, the resource selection turning from checkboxes to radio buttons, the view restored after a reload, a block opening the meeting. _(M)_ `(calendar_ui.spec.ts)`
- ✅ **Filter calendar by staff member** — a column per ticked staff member in the day view, one staff member at a time in the week view, "show my calendar", a day column header leading to that staff member's week. _(M)_ `(calendar_ui.spec.ts)`
- ✅ **Week view pages through the weeks** — bonus; previous / next / today. _(M)_ `(calendar_ui.spec.ts)`
- ✅ **A link to the calendar selects the staff member it names** — bonus; the "show calendar" link on the staff details page, a link opened directly (`?mode&date&resources`), a link to a meeting (`?meetingId`). _(M)_ `(calendar_ui.spec.ts)`
- ✅ **A meeting resource has its own calendar column** — bonus; a facility resource created in the test, its day column and week view. _(M)_ `(calendar_ui.spec.ts)`
- ✅ **Hovering a meeting block shows a card with the staff, the clients and the meeting type** _(E)_ `(calendar_ui.spec.ts)`
- ✅ **A date of the month view opens the week of that date; a day of the small calendar moves the view** — the small-calendar step is skipped on the last seven days of a month, when today may not be in the grid shown. _(M)_ `(calendar_ui.spec.ts)`
- ✅ **The small calendar: double click on a day, the month name, the list of years** — a double click switches between the day and the week view of that day, the month name opens the month view, a year from the list moves only the small calendar, and the return button brings it back. _(E)_ `(calendar_ui.spec.ts)`

### Meeting CRUD

- ✅ **Create one-off meeting in calendar; appears at the right time slot** — API-level create; in the UI by clicking a time slot of the day view (found by geometry, from the block of the seeded meeting of today): the slot gives the date and start time, the column the staff member, the type the duration; two clients, one in a row added with the "add" button. _(M)_ `(meetings.spec.ts, calendar_ui.spec.ts)`
- ✅ **The create form without a meeting type is not accepted** — bonus. _(E)_ `(calendar_ui.spec.ts)`
- ✅ **Modal closing rules on the meeting modal** — the view mode closes on Escape, the close button and a click outside; the edit mode ignores the click outside, and Escape drops the edit with no question asked (nothing is saved). _(E)_ `(meetings_ui.spec.ts)`
- ✅ **Edit meeting time; calendar reflects new slot** — API-level patch; in the UI the date and start time are changed in the edit form (the end time follows), and the toast's "show" button leads to the new place. _(M)_ `(meetings.spec.ts, meetings_ui.spec.ts)`
- ✅ **Delete meeting; gone from calendar and list** — API-level delete + list check; in the UI from the modal (cancel, then confirm) and from the row of the meetings list. _(M)_ `(meetings.spec.ts, meetings_ui.spec.ts, meetings_tables_ui.spec.ts)`
- ✅ **Attendants are removed and added in the edit form** — bonus. _(M)_ `(meetings_ui.spec.ts)`
- ✅ **Cancelling the edit form goes back to the view mode and saves nothing** — bonus. _(E)_ `(meetings_ui.spec.ts)`
- ✅ **A meeting left without staff is saved as facility-wide after a confirmation** — bonus; it then shows in every staff member's column. _(M)_ `(meetings_ui.spec.ts)`
- ✅ **"Create a copy in a week" opens the create form filled in from the meeting** — bonus; the copy and the original become a series with no interval. _(M)_ `(meetings_ui.spec.ts)`
- ✅ **Meeting endpoints are for facility staff and admins only** — bonus; bare member 403, anonymous 401, nothing changed; a non-staff facility admin has access. _(M)_ `(meetings.spec.ts)`
- ✅ **Cancel a meeting via status patch** — _(M)_ `(meetings.spec.ts)`
- ✅ **Clone a meeting to multiple future dates; clones link as a series (fromMeetingId + interval)** _(M)_ `(meetings.spec.ts)`
- ✅ **Switching the client on a meeting drops the old attendant and adds the new one** — _(M)_ `(meetings.spec.ts)`
- ✅ **Mark a client absent on a past meeting via PATCH attendant.attendanceStatusDictId** _(M)_ `(meetings.spec.ts)`
- ✅ **Meeting list filtering by date range / type / staff** — the tquery filters; in the UI the meetings list's sorting, date range, type and staff filters and the text search. _(M)_ `(meetings.spec.ts, meetings_tables_ui.spec.ts)`
- ✅ **Resource (room/equipment) attached to a meeting via resources[]** — create, replace and clear through the API, the `resources.*.dictId` filter; a repeated resource and a non-resource position are rejected. _(M)_ `(meetings.spec.ts)`
- ✅ **A meeting is created with no client, with a status, notes and resources; the modal and the list show them** — the end time changed by hand (the time of the slot is a text until its edit button is used), the status set to "completed" on create, notes of two lines, two resources; read back from the server, in the view mode of the modal and in the row of the meetings list. _(M)_ `(calendar_ui.spec.ts)`
- ✅ **A meeting is created with several staff and clients, each with a status and a notification of their own** — in the Test Notifications layer: two staff members and three clients, attendance statuses set per row, one notification turned on and one off against the clients' own settings (both marked as non-standard); the server has a scheduled notification for one client, a skipped one for the client who cancelled and none for the third; the view mode shows the statuses and the notification switches, the meetings list the statuses next to the attendants and in the columns of their own. _(M)_ `(meeting_notifications.spec.ts)`
- ✅ **An all-day meeting is created with the all-day box of the create form** — the times leave the form; the modal says "all day". _(E)_ `(calendar_ui.spec.ts)`
- ✅ **The notes, the resources and the clients of a meeting are cleared in the edit form** — also the "remote" box; the view mode then shows none of them. _(E)_ `(meetings_ui.spec.ts)`
- ✅ **The urgent notes of a client are shown at the client in the meeting** — in the view mode and the edit form of the modal (following the client chosen in the row) and in the hover card of the calendar; a normal note and one of low priority. _(E)_ `(meetings_ui.spec.ts)`
- ✅ **A disabled meeting type is offered last and marked, and can still be chosen** _(E)_ `(meetings_ui.spec.ts)`
- **A meeting keeps a resource that was disabled since, also through an edit** — expected to fail (`test.fail`): the resource is not shown on the meeting, and a save of any other change in the edit form takes it off the meeting. _(E)_ `(meetings_ui.spec.ts)`

### Meeting validation

- ✅ **Create meeting with invalid duration is rejected** — `durationMinutes: 0`. _(E)_ `(meetings.spec.ts)`
- ✅ **Create meeting with out-of-range startDayminute is rejected** — `startDayminute: 1440`. _(E)_ `(meetings.spec.ts)`
- ✅ **Each field of a meeting is validated; the limits themselves are accepted** — the exact error of some twenty-five patches: a type and a status of another dictionary, an impossible date, notes too long or untrimmed, the start and the duration out of range or not integers, a text for the "remote" flag, a person twice among the staff or the clients, a client as staff and a staff member as a client, an attendance status of another dictionary or none, an unknown key in an attendant; then the last minute of the day, the shortest and the longest duration and the longest notes are taken, and an empty text clears the notes. _(M)_ `(meetings.spec.ts)`
- ✅ **`meeting/conflicts` flags the seeded today meeting when probing the same slot** _(M)_ `(meetings.spec.ts)`
- ✅ **`meeting/conflicts` excludes the seeded meeting when `ignoreMeetingIds` names it** _(M)_ `(meetings.spec.ts)`
- ✅ **`meeting/conflicts` reports nothing for a free far-future slot** _(M)_ `(meetings.spec.ts)`
- ✅ **`meeting/conflicts` ignores work-time / system-category meetings** — covers
  MeetingSeriesController's `category_dict_id != CATEGORY_SYSTEM` filter. _(M)_ `(meetings.spec.ts)`
- **Create meeting in the past warns/blocks (depending on facility config)** — not applicable: neither the backend (`Meeting::getInsertValidator`) nor the form restricts or warns about past dates, and there is no such facility setting. _(n/a)_
- ✅ **Resource-conflicts (two meetings on same resource overlap) flagged** — `meeting/conflicts` with `resources`, the `resourceConflicts.*` tquery columns, touching intervals, a cancelled meeting frees the resource. In the UI: the conflict mark on the taken resource in the edit form, the busy mark on a staff member with another meeting, the "show conflicts" link to the calendar. _(M)_ `(meetings.spec.ts, meetings_ui.spec.ts)`
- ✅ **The meeting form shows the errors of the date and the time** — the edit form: no date; no start time (neither the start nor the length is known); no end time; shorter than five minutes. An end not after the start is not an error: the meeting then ends the next day. _(M)_ `(meetings_ui.spec.ts)`

### Meeting series

- ✅ **Clone meeting → series; original becomes the series head (fromMeetingId+interval shared)** _(M)_ `(meetings.spec.ts)`
- ✅ **Series delete `all` removes the head + every clone** _(M)_ `(meetings.spec.ts)`
- ✅ **Series delete `from_next` removes later clones but keeps the anchor** _(M)_ `(meetings.spec.ts)`
- ✅ **Editing typeDictId of a series member silently breaks its series link** — covers the
  surprising MeetingService:60-65 behaviour (fromMeetingId and interval reset to null on type
  change). _(M)_ `(meetings.spec.ts)`
- **Edit one occurrence ("this only"); others unchanged** — covered implicitly by the patch tests
  (each meeting is independently patchable); no dedicated UI flow for "this only" vs "this and
  future" patches exists in the backend — only delete has the series mode. _(noted)_
- ✅ **Series delete `from_this` (includes anchor + later)** _(M)_ `(meetings.spec.ts)`
- ✅ **Series delete modes are refused on a meeting outside any series; `otherIds` deletes more** — bonus. _(M)_ `(meetings.spec.ts)`
- ✅ **The series dialog clones a meeting to the ticked dates** — bonus; "create series" in the modal, interval switch, an unticked date; afterwards the modal shows 1 / N and "extend series". _(M)_ `(meetings_ui.spec.ts)`
- ✅ **Deleting a meeting of a series offers the series options** — bonus; one / from this / from next / all with the count on the button. _(M)_ `(meetings_ui.spec.ts)`
- ✅ **The series page lists the meetings of a series in order** — bonus. _(E)_ `(meetings_ui.spec.ts)`
- ✅ **Create recurring weekly series via UI** — the app has no drag for this; a series is made with the "create series" checkbox of the create form, opened by clicking a calendar slot, with one date unticked. _(M)_ `(calendar_ui.spec.ts)`

### Work time

- ✅ **Staff creates a work-time meeting (meetingType.work_time) with no clients** — verifies the
  category-derivation path and that the clients[] array can be empty. _(M)_ `(meetings.spec.ts)`
- ✅ **Work-time meetings do not appear as conflicts** — see meeting validation, above. _(M)_
  `(meetings.spec.ts)`
- **Overlapping work-time slots for same staff conflict (if backend enforces)** — not applicable: the backend does not enforce it; no rule looks at other meetings on create or patch, and `meeting/conflicts` skips system-category meetings. _(n/a)_

### Reports / attendants

- ✅ **Meeting list returns staff and clients arrays** — _(E)_ `(meetings.spec.ts)`
- ✅ **The attendants report exports to CSV, a line per attendant, in both formats** — plain CSV and "Excel CSV" (a `sep=,` line first, `.excel.csv`). _(E)_ `(meetings_tables_ui.spec.ts)`
- **The Excel CSV export is written in windows-1250, a byte per character** — written, kept as `fixme`: `writeCSV` passes the encoder's `Uint16Array` to the file, which gets two bytes per character. Excel does open the file, so whether this is a bug is open; the test has never been executed. `(meetings_tables_ui.spec.ts)`
- ✅ **Client details list the client's planned and completed meetings, with the counts in the tabs** — four clients; a meeting of the system category is neither counted nor listed. The "0 rows" checks do not wait for the table to load. _(M)_ `(user_meetings_tables_ui.spec.ts)`
- ✅ **Staff details list the staff member's planned, completed and all meetings** — no counts on that page. _(E)_ `(user_meetings_tables_ui.spec.ts)`
- ✅ **Client details list the people the client had meetings with** — the two staff members and the two other clients of the group meeting, one meeting each; not the client themselves. _(E)_ `(user_meetings_tables_ui.spec.ts)`
- ✅ **Meeting attendants tquery returns rows for each meeting + attendant** — totalDataSize check. _(E)_ `(meetings.spec.ts)`
- ✅ **Meeting client tquery returns one row per client-on-meeting (filtered to one meeting)** _(E)_
  `(meetings.spec.ts)`
- ✅ **Columns of the meetings list are shown and hidden in the column chooser** — bonus; survives a reload, "restore default". _(M)_ `(meetings_tables_ui.spec.ts)`
- ✅ **A column is resized by dragging the edge of its header** — the width survives a reload (kept in the browser) and is reset in the column chooser. _(M)_ `(meetings_tables_ui.spec.ts)`
- ✅ **A row's details button opens that meeting, which links to its place in the calendar** — bonus. _(M)_ `(meetings_tables_ui.spec.ts)`
- ✅ **The attendants report has a row per attendant of each meeting** — bonus; filters by the kind of attendant and by the attendant. _(M)_ `(meetings_tables_ui.spec.ts)`
- ✅ **The clients report has a row per client of each meeting, with the client's data** — bonus; filters by client type and city. _(M)_ `(meetings_tables_ui.spec.ts)`
- ✅ **The export of the meetings list has the values of each kind as texts** — a line per meeting in the order of the table, with only the columns shown: the date, the hours, the type, the status, the lists of the staff and of the clients, the booleans, the empty notes and resources. A meeting of no series has "no" in the series column, where the table has a dash. _(E)_ `(meetings_tables_ui.spec.ts)`
- ✅ **The staff and the clients tables count the meetings of each person, and date the completed ones** — the planned and the completed meetings, the first and the last completed one; not the columns of the last and the next month. _(E)_ `(meetings_tables_ui.spec.ts)`
- ✅ **A long list of meetings is paged, fifty on a page; a list on a details page ten on a page** — 52 copies of a meeting: the page buttons and the arrows of the meetings list, a filter that leaves one page, the planned meetings of the staff member, the count in the tab of the client. _(M)_ `(meetings_tables_ui.spec.ts)`
- ✅ **The export of a paged list is of the page shown, or of all the pages** _(E)_ `(meetings_tables_ui.spec.ts)`
- ✅ **A long text scrolls inside its cell, with its links working**; **a long text is exported whole** — notes of 41 lines with a link. _(E)_ `(meetings_tables_ui.spec.ts)`
- ✅ **The rows of a report are grouped by the attendant, by the meeting or by a column, each group with its count** — the grouping select of the attendants report; the columns outside the group have no values; the summary counts the groups. _(M)_ `(meetings_tables_ui.spec.ts)`
- ✅ **The reports page leads to the help of the reports, which links to each report; a report explains itself** — in Polish, as the help is: the facility admin's reports page, the link of the help to a report (it names no facility), the info icon of the report with the link to the full help page. _(E)_ `(meetings_tables_ui.spec.ts)`
- ✅ **Each table query endpoint names its columns, and returns every one of them** — API: thirteen endpoints (of the facility, of the technicals, of the global admin); every declared column is of a known type, can be asked for, comes in every row, and is empty only if declared nullable. _(M)_ `(meetings.spec.ts)`

### Mark attendance

- ✅ **Mark a client absent (attendanceStatus=cancelled) on a past meeting; reflected in list
  response** _(M)_ `(meetings.spec.ts)`
- ✅ **"Mark as completed" canned action in the meeting view modal sets statusDictId without
  entering edit mode** _(M)_ `(meetings_ui.spec.ts)`
- ✅ **Mark attendance per-attendant via UI (dropdown per row in meeting detail view)** — in the edit mode, for a client and a staff member. _(M)_ `(meetings_ui.spec.ts)`
- ✅ **"Mark as cancelled" by the client** — bonus; saved at once with one client, through the edit form (statuses pre-set, adjustable) with more. _(M)_ `(meetings_ui.spec.ts)`

### Meetings + Client Groups (Test Meetings with Groups layer)

- ✅ **Meeting attendant tagged to a client group references the group in the list response** _(M)_ `(meetings_with_groups.spec.ts)`
- ✅ **Creating a meeting tagging a non-group-member with a clientGroupId is rejected** —
  exercises MeetingClientGroupRule. _(M)_ `(meetings_with_groups.spec.ts)`
- ✅ **PATCH attendant `clientGroupId=null` preserves the client but clears the group link** _(M)_
  `(meetings_with_groups.spec.ts)`
- ✅ **`/client-group/assign-to-attendants` (non-developer branch): sets the group on every
  existing meeting where the named client is an attendant** _(M)_
  `(meetings_with_groups.spec.ts)`
- ✅ **Deleting a client group nulls every attendant.client_group_id that referenced it; the
  attendant rows themselves stay** — covers ClientGroupController.delete cascade. _(M)_
  `(meetings_with_groups.spec.ts)`
- ✅ **PATCH `/client-group/{id}` can rename (notes) and replace the member list at once** _(M)_
  `(meetings_with_groups.spec.ts)`

UI (`meetings_with_groups_ui.spec.ts`):

- ✅ **Client details list the meetings of the client, of the client's group, and those with no group** — the switch above the tables, the count of the meetings with no group in its label; a member who was not at the group's meeting sees it too; a client in no group has no switch. _(M)_
- ✅ **The meeting form proposes the group of a single client; without a group on request** — editing a meeting of one client puts it in the client's only group; the "none" mode takes the group off; the view mode shows the group. _(M)_
- ✅ **The other members of the group are added with one button** — "add all"; all are saved with the group. _(M)_
- ✅ **Clients with no common group get a group each; with a common one, they can share it** — the form turns to a group per client, proposing the first group of each; a client's group is chosen among the client's groups; two members of one group are switched to the shared mode. _(M)_
- ✅ **The create form offers the groups of a client, and narrows them down with more clients** — a client in two groups gets one proposed and the other to choose; a second client leaves only the group the two share, with no choice; both are saved with it. _(M)_
- ✅ **With a group per client, the group of one client is switched off and on** — the toggle next to the client; the form opens again in the same mode. The toggle has no accessible name and is found by the colour class of its icon. _(M)_

---

## Layer: Test Time Tables (parent: Test Facility)

The Time Tables layer (`layers/time_tables.ts`) adds time tables to the first week after the current one that, with the week after it, has no public holiday (by the app's own list) — one week, away from today, so the tests do not depend on the day they are run on. Work times and leave times are meetings of the fixed types `work_time` and `leave_time` (system category), of a staff member or facility-wide (no staff):

- facility-wide work times 8:00–16:00, Monday to Friday; a facility-wide leave day on Friday;
- STAFF: work times on Monday (9:00–15:00 with notes, and 16:00–18:00), Tuesday and Wednesday (9:00–15:00); an all-day leave time on Thursday;
- STAFF_ADMIN: a work time on Thursday (10:00–14:00); a leave time on Tuesday, 12:00–14:00.

The weeks of the pages follow the browser's locale; in the Polish one, which all the page tests run in, they start on Monday, as the layer counts them.

- ✅ **ADMIN sees empty weekly time table; can add a slot** — the weekly page has no adding of its own: an empty week shows as such next to the seeded one, and entries are added in the time tables calendar it links to — a work time of a staff member, and a facility-wide leave day. _(M)_ `(time_tables_ui.spec.ts)`
- ✅ **Define a recurring weekly availability per staff** — with the actions of the weekly page: a week copied to another one (replacing what was there), and repeated every second week up to a chosen week (keeping what was there). _(H)_ `(time_tables_ui.spec.ts)`
- **Time table conflicts with an existing meeting block** — not applicable: time tables and meetings do not conflict; `meeting/conflicts` skips the system category, which `time_tables.spec.ts` asserts for a leave time and a work time. Only work times overlapping each other are marked, in the weekly page (covered below). _(n/a)_
- ✅ **STAFF sees only their own time table, ADMIN sees all** — as the app has it: the time tables pages are for facility admins (the denial for staff is in `facility.spec.ts` and `smoke.spec.ts`); a staff member sees the work times and leave times of any staff member in the calendar, read-only, and everybody's leave times on the absences page. The API does not tell time tables from other meetings: any staff member may create and change them (see the note below). _(M)_ `(time_tables_ui.spec.ts)`

API (`time_tables.spec.ts`):

- ✅ **Seeded time tables are listed per staff member and facility-wide** — the filters of the time tables pages; `isFacilityWide`, the system category. _(E)_
- ✅ **Time tables stay out of the meetings conflicts** _(E)_
- ✅ **A leave time is created, changed and deleted through the meeting endpoints** — all-day, then a part of a day, then facility-wide by dropping the staff member. _(M)_
- ✅ **A time longer than a day or starting outside it is rejected** _(E)_
- ✅ **Work times of a week are copied to other weeks by cloning, and deleted in one request** — the two requests the weekly page is built on (`clone` with no interval, `delete` with `otherIds`). _(M)_
- ✅ **Time tables are closed to a member without a role, and to an anonymous caller** _(E)_

UI (`time_tables_ui.spec.ts`):

- ✅ **Weekly time tables show the facility-wide and the staff member's work times** — hours per weekday, weekly totals, day notes for leave times, the selection surviving a reload, the week's link to the time tables calendar. _(M)_
- ✅ **Touching and overlapping work times are marked in the weekly time tables** _(M)_
- ✅ **A week's work times are copied to another week, replacing what was there** — "select week" + "paste here"; the counts in the confirmation. _(M)_
- ✅ **A week is repeated every second week up to a chosen week, keeping what was there** — "paste until here", the interval switch, "delete existing" off. _(M)_
- ✅ **Work times of a week are deleted, on the ticked weekdays only** — the weekday checkboxes of the header; leave times and facility-wide work times are not touched. _(M)_
- ✅ **A week is repeated until the end of the table; the weeks from a chosen one on are deleted** — "paste this until end" and "delete from this", with the table's range shortened to a month so that the test does not write a year of weeks. _(M)_
- ✅ **Deleting with nothing to delete cannot be confirmed; cancelling changes nothing** _(E)_
- ✅ **Copying a week skips the holidays of the target week unless told not to** — on the week of the nearest Christmas Day; the app has its holidays listed up to 2027. _(M)_
- ✅ **Time tables calendar shows the week's work times and leave times, and their details** — the summaries per day, the view modals of a work time, a staff leave time and a facility-wide one, switching the staff member. _(M)_
- ✅ **A work time is added from the time tables calendar** — the day's "add" button, the staff / facility-wide and work / leave choice. _(M)_
- ✅ **A facility-wide leave day is added from the time tables calendar** _(M)_
- ✅ **A click in the hours area of the time tables calendar starts a work time at that hour** — the click is aimed by geometry (the area is the whole day high). _(M)_
- ✅ **The month and day views of the time tables calendar** — the month view with the entries of the staff member and of the facility, and the details opened from it; the day view with a column per selected staff member. _(E)_
- ✅ **A work time is changed and then deleted from its details** _(M)_
- ✅ **A leave time of a part of a day is added for a staff member; then made a whole day, with no notes** — a leave time is of the whole day unless the box is unticked; the notes are cleared in the edit form. _(M)_
- ✅ **A work time is added as a weekly series, without the unticked dates** — the "create series" checkbox of the create form. _(M)_
- ✅ **A leave time is made a series from its details, and the series is then extended** — day by day unless told otherwise; the button then reads "extend series". _(M)_
- ✅ **The system meetings list has the seeded work times and leave times** — the page outside the menu; 10 work times and 3 leave times, by type and by staff member. _(E)_ `(time_tables_ui.spec.ts)`
- ✅ **Absences page lists the leave times of all the staff and of the facility** — as staff; month view only, view-only. _(E)_
- ✅ **Staff member's calendar shows the work times and leave times, read-only** — a click on one starts a new meeting, as a click on the day does. _(M)_

Note: the backend has no rule of its own for time tables — `work_time` and `leave_time` meetings go through the meeting endpoints with the meeting permissions, so a staff member who is not an admin can create, change and delete the work times and leave times of anybody, and the facility-wide ones, through the API, although the pages for it are for facility admins only.

---

## Layer: Test Notifications (parent: Test Meetings)

The Notifications layer (`layers/notifications.ts`) gives the facility a notification template, two clients the SMS notification method (Adam, who has a phone number, and Carl, who has none), and adds a meeting in 10 days with a notification for Adam (and Bea, not notified). Notifications are sent two days before the meeting by a scheduled backend job; the tests keep to meetings at least three days away, so nothing is ever due and no gateway is involved.

- **Triggering a notification sends to the configured method (stubbed)** _(H; external)_
- **Template substitution in notification body** — happens at the time of sending. _(H)_
- **Set notification method on a client; reflected in meeting attendants** — covered by the tests below: the method set on a client decides the default of a client added to a meeting, and `notification/method` adds notifications to the client's coming meetings. _(see below)_

All in `meeting_notifications.spec.ts`:

- ✅ **A meeting's notification is listed for the admin and shown on the meeting's client** — status, the template placeholder as the subject, no address yet, the time of sending. _(E)_
- ✅ **A notification with an unknown method is rejected** _(E)_
- ✅ **Notification is skipped while the meeting or the client's attendance is off** — cancelled / completed meeting, cancelled attendance; scheduled again once they are back. _(M)_
- ✅ **The time of sending follows the meeting's date and time** — two days before, at 12:00, 14:00 or 16:00 of the app's time zone. _(M)_
- ✅ **Notification goes away with the request for it, with its client and with the meeting** _(M)_
- ✅ **Copies of a meeting get notifications of their own** _(M)_
- ✅ **Admin adds notifications to a client's coming meetings in one request** — `PATCH user/client/{id}/notification/method` by the client's own methods and by a named one; 403 for staff. _(M)_
- ✅ **Notifications page lists the notification, among the coming ones** — the "past" / "future" tabs. _(E)_
- ✅ **The notifications table has a value in each column, and leads to the client and to the meeting** — the time of sending, the status, the empty address with its hint, the standard subject, the creator; the details button opens the meeting, the client's name the client's page. _(E)_
- ✅ **The export of the notifications table names the client** — and has the subject as the server keeps it. _(E)_
- ✅ **Meeting details show who is notified, and the state of the notification** _(M)_
- ✅ **Notification is turned on for a client in the meeting's edit form** — the "non-standard" mark, the missing phone number warning. _(M)_
- ✅ **A copy keeps the notifications of the original; a client added to it gets the default ones** _(M)_

---

## Cross-cutting concerns

These are not tied to a specific layer; the right home for them is the lowest layer that has the data they need.

### Read-only "every page renders" smoke (`readOnlyTest`)

A single spec file that walks every routable page as STAFF, ADMIN, and STAFF_ADMIN, asserting no error boundary triggered and a known landmark element is visible. Cheap because `readOnly` skips post-test restore. _(M; matrix; ~10–20 tests)_

✅ Implemented as a 4-role × 21-page matrix in `smoke.spec.ts` — one test per role, one step per page, with soft assertions so that one page failing does not hide the others; a page that renders is recognised by a landmark of its own body (a table column, a heading, the calendar's "today" button), not by the header (10 facility pages, 6 facility-admin pages — time tables, reports, notifications, technicals — and 5 global-admin pages per role; STAFF and BARE_MEMBER get `no_permissions_to_view` where they have no access, the others render).

### i18n parity

- **Every label key referenced by the rendered UI exists in `pl_PL` translations** — outside Playwright; better as a unit / build-time check. _(skip in e2e)_

### Time zone

- **Facility set to a non-local TZ shows meeting times in facility-local TZ** — not applicable: there is no time zone per facility; the app has one (`app.user_timezone`, reported in `system/status`), and meeting times are a date and a minute of the day. _(n/a)_
- ✅ **User browser in a non-facility TZ sees the calendar consistent with facility TZ** — in a browser half a day away from the app's time zone: a meeting keeps its date and time. _(H)_ `(cross_cutting.spec.ts)`
- ✅ **Calendar's today is the app's today in a browser of another time zone** — the day view opens on the day of the meeting seeded for today, with the "today" button disabled. _(H)_ `(cross_cutting.spec.ts)`

### Session expiry

- ✅ **Force-expire the session (clear cookies); next interaction redirects to login modal** — the next request ends on `/login`, with nothing of the facility left on the screen. _(M)_ `(cross_cutting.spec.ts)`

### System status / needs-reload

- ✅ **App detects a backend version change and prompts reload** — the `system/status` response is rewritten on the way to the browser; the reload button appears, and reloads. _(H; request interception)_ `(cross_cutting.spec.ts)`

---

## Gaps and weak spots

### Not tested

Listed in the sections above, without ✅:

- **OTP, the rest** — the expiry of the generated secret, the QR code.
- **Time-dependent behaviour** — the screen saver after idling.
- **Sending of notifications** — the scheduling is tested; the sending itself and the template substitution are not.
- **Scale and concurrency** — two clients created at once. (The pages of a long list are tested with 56 meetings.)
- **Combinations of fields in the forms, the rest** — the client form, the meeting form, the user forms (of the global admin, and the user's own fields in the staff details), the facility form and the client group form have tests going through the fields left out by the typical fill: each given, each cleared, each read back where the app shows it. Not done the same way: the facility admin modal (it has the same fields of the user as the staff details form; only the name and the email are edited there), every role combination of a member against what the member can then do, a client group of a client in several groups, the meeting series dialog (the interval and the unticked dates are tested, not the other lengths of a series), the work time form beyond the times and the notes.
- **What a table shows for a value of each kind, the rest** — the cells of the clients table (fields, attributes, groups, meeting counts), of the meetings list, and of the tables of users, facilities, staff, admins, notifications, attributes, dictionaries and positions are checked, and the exports of the clients, meetings, attendants, users and notifications tables. Not checked: the cells of the attendants and the clients reports beyond the names, types and cities their tests look at, the system meetings list and the DB dumps table (empty on the `docker` target); the exports of the other tables; the columns of the last and the next month of the meeting counts (the server counts them from its own date, which around midnight is not the date of the tests); a role in a group in the clients table; a filter of a column in a table other than the clients table and the meetings reports.
- **DB dump create / restore through the app** — exercised only as a side effect of the framework, and only with the `rc` target, which was run on a few tests only. **Deleting a facility** — left out on purpose.

Not listed anywhere above:

- **Pages and endpoints with no test of their own** — from a survey of the routes of the frontend (`App.tsx`) and of the API (`routes/api.php`). Pages: the DB dumps page beyond rendering (see Anti-tests); the developers' pages (left out on purpose). Endpoints: `GET user/logout` (the form uses `POST`, which the UI tests go through); `user/password` and `user/logout` through the API alone (the UI tests use them); `mail/test` and `system/log` with a valid body (one sends a mail, the other writes to the log); `admin/db-dump` create and restore; `admin/developer/*` beyond the denials; `/docs-remote/*` (it fetches from a server set in the `.env`). Every other page and endpoint has a test that asserts something of its own.

- **Per-form validation, the rest** — the client, meeting, facility, user and managed-admin forms have a test each that goes through the errors field by field (`expectFormErrors` of `helpers/selectors.ts` compares the whole set of errors shown). The rules of a meeting's fields are tested through the API (`meetings.spec.ts`), those of the user's fields in the global admin's create form only. Not covered: the attendants of the meeting form, the client group form and the staff edit form in the UI (no rule of their own was found to trip there), the work time and leave time forms, the dictionary and attribute forms beyond the errors already tested in `technicals_ui.spec.ts`.
- **Advanced view of the saved views of a table** — not tested, and not planned: rename / duplicate / overwrite, view codes.
- **Real translations** — the tests run in the testing language and assert on keys; the Polish texts are seen only by one smoke test (three pages) and by the help tests. Plural forms other than "one" and most texts are never checked; of the formats of the locale, the dates and the times are.
- **Other environments** — one desktop viewport; no accessibility or visual checks; not run in CI. Edge is not run: it is Chromium, which is. One test is `fixme` in Firefox for an app problem listed at the end, and the CSV export tests are skipped there (no export in a browser without the File System Access API).
- **Permissions of time tables** — any staff member can change anyone's work times and leave times through the API (see the note in the Time Tables section). A product decision; no test pins it either way.

### Weak spots in the existing tests

From a review of the specs; none of these is fixed yet.

- **Visibility checks inside a folding section** — fixed where found: the checks on content of a `HideableSection` use `expectSectionShown` of `helpers/selectors.ts` (`toBeVisible` / `toBeHidden` pass there whatever the state). A new test of such content has to use it too; nothing enforces that.
- **Loose assertions** — fixed in the API specs: counts are exact, and a refused request is checked for the exact set of field errors with their codes (`expectValidationErrors` of `lib/responses.ts`). Exact counts turned up two things `>=` was hiding: the attendants table had 13 rows where the test said 6, and the member table of a facility also lists every global admin and the system user. Still loose: the "a name is visible" tests of the older specs, which the `*_ui` specs have superseded.
- **Fragile selectors** — less than before: tables have roles and their cells the id of the column (`allTableRows`, `tableCell` of `helpers/selectors.ts`), the calendar's previous / next buttons have titles, the days and the header buttons of the small calendar and the hours area of a day carry `data-` attributes, the group switch of a client in the meeting form has `aria-pressed`, and the warning mark of the user settings button, the hover card of a calendar block, the month inputs of the weekly time tables, the box of a form field and the button clearing all the filters of a table carry `data-` attributes too. Left: elements found by position (`meeting_notifications.spec.ts`, some of `time_tables_ui.spec.ts`; in `attribute_values_ui.spec.ts` the delete and add buttons of a list attribute, which have no names, are the first and the last button of its row, and the list of a multiple select is closed by a click on the first label of the form), the arrows of the page buttons of a table, which have no names and are found next to the numbers (`meetings_tables_ui.spec.ts`), the first match of an ambiguous locator (`meetings_ui.spec.ts`, `clients_ui.spec.ts`, `technicals_ui.spec.ts`, and the link of a group member in `client_groups_ui.spec.ts`: a user link is two links); a calendar slot clicked by geometry (`helpers/calendar.ts` — the hours area is one element that works out the time from where it was clicked, so there is nothing else to click); one `networkidle` wait (`cross_cutting.spec.ts`).
- **Midnight** — a run that crosses local midnight is not supported: the layers and the tests would disagree about "today".
- **Run time** — for the record, not a task: the suite is run by hand, not in CI, so the time matters little. A restore of the DB after each mutating test is the largest cost. It was 6 s, all of it round trips to the remote DB (about 16 ms for each of the dump's 300 statements); sent in a few compressed batches it is a little over 1 s. A snapshot is still 6–7 s, but is taken only when a layer is set up and when a test fails. Sharing a restore among small API tests, or ordering the specs by layer, would now save little.
- **Backend stalls** — seen once: the API of the local server took 5–20 s per request for one page load, and the test timed out on a 10 s assertion. Not reproduced; the cause (probably the connection to the remote DB) is not confirmed. Also seen once, on the `docker` target: the facility admin's attributes page stayed blank after its load, and the test failed on the switch of the language; it passed when run again, and the cause is not known.

### App problems the tests ran into, not fixed

- `client.contactEmail` accepts any string.
- In Firefox, with the long labels of the testing language, the attendance status column of the meeting form is squeezed to a letter per line, and the form grows too tall for its options to be clicked. Whether real (shorter) labels wrap badly there too has not been checked.
- Hours before 10 are shown as "9:00" in Chromium and as "09:00" in Firefox (`formatDayMinuteHM`, `hour: "numeric"` formatted by the browser).
- A user with no stored state of the news (a new one) is not shown the link to the news in the first session; it appears from the next page load on (`newspaper.ts`: nothing is loaded, so the "read at version" stays unset until the state is stored).
- The password field of the user form is read-only until clicked (against the browser's autofill), so it cannot be reached and typed into with the keyboard alone (`UserBaseInfoFields.tsx`).
- The attendants label of the meeting form counts an empty row, in the view mode of the meeting too: three clients are announced as four (`MeetingAttendantsFields.tsx`).
- The blocks of the time tables calendar's week summary have no click handler; a meeting series of an unknown id shows an empty table, not "not found".
- Escape in the edit mode of the meeting modal drops the changes with no question, unlike the cancel button.
- A `datetime` attribute has no control in the forms (`AttributeFields.tsx`, a TODO there), though the attributes page offers the type (`AttributeForm.tsx`); and a client that has such a value (given through the API) cannot be saved in the edit form at all: the form sends the value back with microseconds, which the server refuses (`validation.date_format`; the rule is in `Valid.php`).
- A multi-value `bool` attribute, which the attribute form lets an admin create (`AttributeForm.tsx`), makes the client form throw ("Unsupported multiple attribute of type bool", `AttributeFields.tsx`), leaving the client create page blank for the whole facility.
- An `int` attribute value outside the 32-bit range is answered with a 500 (`values.int_value` overflows; no range rule in `AttributeType.php`).
- A checkbox attribute has no "no value" state in the forms: every client created or edited through a form gets `false` for every optional `bool` attribute (`AttributeFields.tsx`, `CheckboxField.tsx`).
- The requirement level `empty` is not enforced by the backend (`AttributeRequirementLevel.php`), and `required` attributes get a non-nullable tquery column although clients from before the attribute lack the value: they cannot be filtered for (`Attribute.php`, `TqDataTypeEnum.php`), and cannot be saved in the edit form until the value is given.
- `users` attributes accept any user (no facility check); `clients` attributes need an id the API does not expose (`AttributeType.php`); the forms have no control for either and show no value (`AttributeFields.tsx`). The api name of an attribute is unique across facilities, so one facility's names are taken for the others (`AttributeValidation.php`).
- In the clients table and its CSV, the dates of a list attribute are shown as `YYYY-MM-DD`, unlike a single date (`tquery_text_formatter.ts` and the table cells); the tquery returns the booleans and times of a list in the DB's form (`TqAttribute.php`).
- A dictionary position that has been disabled is left out of the selects of the forms, also where it is the value: a meeting does not show its disabled resource, and loses it with the next save of the meeting form (`MeetingForm.tsx`, the `resources` select); a client's edit form opens without the disabled positions of the dictionary attributes, so a required one has to be chosen anew and a list is saved without them (`AttributeFields.tsx`; the default of `DictionarySelect.tsx` is to hide them, only the meeting type select shows them as deprecated). The details of a client still show such values.
- The resources of a meeting come from the server in no defined order (`Meeting.php`, the `resources` relation has no ordering).
- The staff and the admins pages offer the columns of a user's account (email verified, password expiry and last change, OTP required and configured, failed logins, the managing facility, the deactivation) to facility admins only (`StaffList.page.tsx`, `FacilityAdminsList.page.tsx`), but the table queries behind them give every column to any staff member, and the members query also the names of all the facilities of a user (`StaffTqueryController.php`, `MemberTqueryController.php`, `AdminUserTquery.php`). In the development mode of the frontend, which the `docker` target runs, a browser in which an admin had shown these columns keeps showing them to a staff member who logs in next (`TQueryTable.tsx`, the columns the page does not configure).
- `system/dictionary/list` and `system/attribute/list` need no login, and give the dictionaries, their positions and the attributes of every facility (`SystemController.php`); a logged-in user gets those of the other facilities too.
- `system/status` tells a caller who is not logged in the environment, the commit, the time of the last DB dump, the load and the free disk space of the server, which the About page shows to logged-in users only, and all but the first two to the global admin only (`SystemController.php`, `About.page.tsx`).
- The export of the notifications table has the subject as the server keeps it (`{{meeting_facility_template_subject}}`), where the table words it as the default subject, and a column of the meeting's id that the table does not have (`NotificationsList.page.tsx`).
- The export of the meetings list has "no" in the series column for a meeting of no series, where the table shows a dash (`meeting_tables.tsx`).

## Anti-tests (deliberately out of scope)

Things to _not_ try to e2e-test, with rationale:

- **Database dump/restore admin UI** — restoring a dump from inside a test would corrupt our own snapshot stack. The endpoints behind it are exercised by the framework on the `rc` target.
- **Throttle exhaustion at scale** — flaky; better via direct backend tests with mocked clock.
- **OTP enrollment with brute-force defenses** — slow and flaky; minimal value over the happy-path test.
- **Translation completeness** — build-time JSON check, not e2e.
- **Heavy concurrency** — covered by backend tests.
