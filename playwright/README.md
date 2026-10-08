# Memo E2E tests

Playwright tests of the app, through its UI and its API. What is tested is listed in
[TESTS.md](TESTS.md); this file is about running them.

The tests run **outside the app's container**: on the machine itself (under WSL, in WSL), from the
root of the checkout. They need there:

- Node (the version `pnpm install` accepts) and pnpm, with the packages installed: `pnpm install`.
  This `node_modules` is apart from the one of the app's container, which keeps its own in a
  volume, so the two do not replace each other's packages.
- The browsers of Playwright, installed once: `pnpm exec playwright install chromium firefox`
- For the `docker` and `local` targets: the MariaDB client programs (`mariadb`, `mariadb-dump`).
- For the `docker` target: docker, and the image of the app's own container
  (`docker compose build`).

## Quick start

The quickest way needs no configuring: the template of the `docker` target is a complete config
as it is. The tests then run on servers they start for themselves, leaving your `.env`, your dev
server and its DB alone:

```sh
MEMO_E2E_CONFIG=playwright/config/config.docker.template.json pnpm :playwright
```

The other targets (see "Targets") need their config templates copied and filled in.

```sh
pnpm :playwright-rep
```

`config/config.json` is the config used by default. To keep several and pick one for a run, name
it in `MEMO_E2E_CONFIG`, as a path from where the command is run:

```sh
cp playwright/config/config.local.template.json playwright/config/config.local.json
# Fill config.local.json in.

MEMO_E2E_CONFIG=playwright/config/config.local.json pnpm :playwright
```

The config files can hold passwords and are ignored by git.

## Targets

What the tests run against is the `targetType` of the config. Each template in `config/` explains
its own settings; the one of `docker` works unchanged, the others have to be filled in.

| Target   | The app server                                             | Its DB                                          | Template                      |
| -------- | ---------------------------------------------------------- | ----------------------------------------------- | ----------------------------- |
| `docker` | Started by the tests, in a container, on a port of its own | Started by the tests, in a container, in memory | `config.docker.template.json` |
| `local`  | Already running                                            | The one its `.env` points at, reached directly  | `config.local.template.json`  |
| `rc`     | Deployed                                                   | Reached through the DB dump API                 | `config.rc.template.json`     |

With `docker`, the DB starts from one of two bases (`docker.base`):

- `empty` — the app's migrations only. Needs nothing else. Shows that the tests rely on
  nothing but what they make themselves.
- `copy` — a copy of the DB your `.env` points at. Shows that the tests also pass next to real
  data, as they have to on an rc server.

On either base the tests create their own global admin, and a run logs its e-mail and password at
the start, so that you can log in to that server too. The config takes no `ui.admin` here.

The suite should pass on both. To switch, change `docker.base` (the DB is made anew), or keep a
config file for each.

The containers (`memo-e2e-php`, `memo-e2e-db`) stay up after a run, so that the next one starts at
once. `docker rm -f memo-e2e-php memo-e2e-db` removes them; `docker rm -f memo-e2e-db` alone gives
the next run a new DB. If the frontend dev server ran in `memo-e2e-php` (see below), also delete
`public/hot` and `public/hot!` then, or your own server on the checkout keeps loading from it.

The app in `memo-e2e-php` keeps its cache apart from the checkout's (in memory), and the tests
clear it when the login throttle (5 a minute) stops them; on the other targets they wait the
throttle out.

The frontend comes from the Vite dev server. If yours is running, the tests use it; if not, they
start one in `memo-e2e-php`.

### Never on a DB in real use

On the `local` and `rc` targets the tests work on a DB they did not make: they fill it with their
data and restore it over and over, which loses whatever anyone else does in it meanwhile. So a
start is refused, before anything is touched, when:

- the server at `ui.baseURL` reports the `production` environment;
- `local`: the `.env` has `APP_ENV=production`, or points at a DB other than the one the config
  names in `expectedDB` (host, port and name);
- `rc`: `ui.baseURL` and `dbAPI.baseURL` are the same server.

The `docker` target needs none of this: it makes its own DB, and checks that its app uses it.

## How the DB is handled

All tests share one DB, so there is one worker and one run at a time. The DB is built in layers
(a facility, then its clients, then their meetings, …); a test declares the layer it needs, and
after a test that changes something the DB is restored to that layer. At the end of the run the DB
is back as it was at the start.

- `test` is for a test that changes the DB, `readOnlyTest` for one that does not — which is
  checked.
- A test that drives a page has to be tagged `{tag: "@ui"}` — also checked. See "Projects and
  browsers" below.

## More commands

All of these are the quick start's command with something added: what follows `pnpm :playwright`
goes to `playwright test`, and the variables before it reach the tests.

```sh
# One spec file, or several
pnpm :playwright specs/clients_ui.spec.ts
pnpm :playwright specs/clients_ui.spec.ts specs/clients.spec.ts

# One test: by a part of its title, or by its line in the file
pnpm :playwright -g "staff creates a new client"
pnpm :playwright specs/clients_ui.spec.ts:14

# Only the tests that talk to the server alone
pnpm :playwright --project=api

# Only the tests that drive a page: in one browser, or in all
pnpm :playwright --project=chromium
pnpm :playwright --project=firefox
pnpm :playwright --grep @ui

# Everything once: no test repeated in a second browser
pnpm :playwright --project=api --project=chromium

# Watching the browser, or stepping through a test
pnpm :playwright specs/clients_ui.spec.ts:14 --project=chromium --headed
pnpm :playwright specs/clients_ui.spec.ts:14 --project=chromium --debug

# A test several times, to see whether it is stable
pnpm :playwright -g "staff creates a new client" --project=chromium --repeat-each=10

# Another config
MEMO_E2E_CONFIG=playwright/config/config.local.json pnpm :playwright
```

### Watching, picking and rerunning tests in the Playwright UI

```sh
MEMO_E2E_REUSE_STATE=1 pnpm :playwright --ui
```

This opens Playwright's own window, with the list of all tests on the left. There you can run one
test, a file or everything, rerun what failed, filter by title, by `@ui` or by browser (the
projects are off except the first until ticked), and watch each step of a test with a snapshot of
the page before and after it. The "watch" eye next to a test reruns it whenever its file changes.

If no window opens (it needs a display; under WSL that is WSLg), serve the UI and open it in any
browser, here at http://127.0.0.1:8090:

```sh
MEMO_E2E_REUSE_STATE=1 pnpm :playwright --ui-host=127.0.0.1 --ui-port=8090
```

Things to know about this mode:

- The setup of a run (the lock, the containers, the clean state of the DB) is done when the page
  of the UI loads, and its teardown when the window is closed. Close the window, or stop the
  command with Ctrl+C, and do not kill it — or see "After a run that was killed".
- Each load of the page does the teardown and the setup again. So wait for the list of tests
  before running anything, and do not reload the page, or open it a second time, while tests run:
  they then fail, with the state of the run gone.
- While it is open it holds the run lock: no other run can start.
- Do not open it while another run is in progress. Its tests are then refused — the list shows a
  red `layers.ts` only, with the reason in the output pane — and opening it deletes
  `test-results/`, which fails tests of the run in progress.
- To only watch the browser of a run started from the command line, `--headed` is enough.

### Starting faster

Building the layers takes a minute or so of a run. With `MEMO_E2E_REUSE_STATE=1` a run starts from
the layers the previous one left, if they still fit (same target, same day, same setup code, and
the DB unchanged since). Not on the `rc` target, where a changed DB cannot be told:

```sh
MEMO_E2E_REUSE_STATE=1 pnpm :playwright specs/clients_ui.spec.ts
```

### After a run that was killed

A run that did not get to clean up (killed, or the machine went down) leaves its state behind, and
the next start is refused, with instructions. In short:

```sh
MEMO_E2E_RECOVER=1 pnpm :playwright
```

brings the DB back to the clean state of the interrupted run, and goes on.

## Projects and browsers

The tests are split into three Playwright projects, defined in `playwright.config.ts`:

| Project    | Its tests                                               |
| ---------- | ------------------------------------------------------- |
| `api`      | The ones that talk to the server alone; need no browser |
| `chromium` | The ones that drive a page (tagged `@ui`), in Chromium  |
| `firefox`  | The same ones, in Firefox                               |

Without `--project`, all three run, one after another in this order: Playwright has no setting
for a default choice of projects. So the plain command runs every page test twice. To run each
test once, name the projects: `--project=api --project=chromium`. `--project` can be repeated, and
takes `*` as a wildcard.

Edge is not run separately — it is Chromium.

A few tests are skipped in Firefox, each with its reason: the CSV exports (Firefox has no API for
them, and the app does not export there), and the tests of app problems listed at the end of
TESTS.md.

## When a test fails

`playwright/test-results/` has, for each failed test, a screenshot, a video, a trace
(`pnpm exec playwright show-trace <trace.zip>`), and a dump of the DB as the test left it.
The output of the run logs each test, each DB restore and each layer setup with its time, and
after each test how many are done and the time elapsed.

## Layout

- `specs/` — the tests.
- `helpers/` — helpers tied to the shape of the app's pages and data: selectors, the calendar, the
  testing language, saved files, queries of the API.
- `lib/` — the machinery: the config, the targets and their DB handling, the layers (`lib/layers/`
  has the data each layer makes), the API client, the `test` fixtures.
- `config/` — the config templates, and your configs.

## Checking the test code

```sh
pnpm playwright-typecheck
pnpm playwright-lint
```
