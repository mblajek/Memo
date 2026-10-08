import {ADMIN, BARE_MEMBER, FACILITY, STAFF, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import type {Locator} from "@playwright/test";
import type {Credentials} from "../lib/config.ts";
import {expect, login, openPage, readOnlyTest} from "../lib/test.ts";

/** Finds, in the page's `main`, an element that only the body of that page renders. */
type Landmark = (main: Locator) => Locator;

const text =
  (key: string): Landmark =>
  (main) =>
    main.getByText(key, {exact: true}).first();
const tableColumn = (table: string, column: string) => text(`tables.tables.${table}.column_names.${column}`);
const calendarTodayButton =
  (key: "today" | "this_month"): Landmark =>
  (main) =>
    main.getByRole("button", {name: new RegExp(`^calendar\\.${key}$`, "i")});

facilityLayer.describe(() => {
  // Read-only matrix: each routable page is loaded as four facility roles. Per-page expectation
  // depends on the page's AccessBarrier role and the user's permissions.
  const ROLES: readonly {
    label: string;
    creds: Credentials;
    isFacilityStaffOrAdmin: boolean;
    isFacilityAdmin: boolean;
  }[] = [
    {label: "STAFF", creds: STAFF, isFacilityStaffOrAdmin: true, isFacilityAdmin: false},
    {label: "ADMIN", creds: ADMIN, isFacilityStaffOrAdmin: true, isFacilityAdmin: true},
    {label: "STAFF_ADMIN", creds: STAFF_ADMIN, isFacilityStaffOrAdmin: true, isFacilityAdmin: true},
    {label: "BARE_MEMBER", creds: BARE_MEMBER, isFacilityStaffOrAdmin: false, isFacilityAdmin: false},
  ];
  // Pages wrapped in <FacilityAdminOrStaffPages> — require facilityAdmin OR facilityStaff. The
  // BARE_MEMBER (member without role) is blocked.
  //
  // `/home` is intentionally NOT here: it's outside FacilityAdminOrStaffPages (open to any
  // facilityMember), and renders a `<Navigate>` to `/calendar` which only fires once
  // `activeFacility()` resolves. For BARE_MEMBER the redirect doesn't reach the calendar
  // AccessBarrier in time / at all, so there's no `no_permissions_to_view` fallback to assert
  // against. The /home → /calendar redirect is covered in `facility.spec.ts`.
  const FACILITY_PAGES: readonly (readonly [path: string, landmark: Landmark])[] = [
    // The calendar opens in the view the user had last: day and week have "today", month "this month".
    ["calendar", calendarTodayButton("today")],
    ["absences", calendarTodayButton("this_month")],
    ["staff", tableColumn("staff", "name")],
    ["clients", tableColumn("client", "name")],
    ["clients/create", (main) => main.getByRole("heading", {name: "forms.client_create.form_name"})],
    ["admins", tableColumn("facility_admin", "name")],
    ["meetings", tableColumn("meeting", "date")],
    ["meeting-attendants", tableColumn("meeting_multi_attendant", "attendant.userId")],
    ["meeting-clients", tableColumn("meeting_client", "attendant.userId")],
    // Not in the menu; a list of the system meetings (work times, leave times) for developers.
    ["system-meetings", tableColumn("meeting", "isClone")],
  ];
  // Pages wrapped in <AccessBarrier roles={["facilityAdmin"]}>. Only facilityAdmin gets through.
  const FACILITY_ADMIN_PAGES: readonly (readonly [path: string, landmark: Landmark])[] = [
    ["admin/time-tables", calendarTodayButton("today")],
    ["admin/time-tables/weekly", tableColumn("time_table_weekly", "weekDate")],
    ["admin/reports", text("reports.select_report_from_menu")],
    ["admin/notifications", (main) => main.getByRole("tab", {name: "tables.tables.notification.mode.all"})],
    ["admin/technicals/attributes", tableColumn("attribute", "displayName")],
    ["admin/technicals/dictionaries", tableColumn("dictionary", "displayName")],
  ];
  // Pages wrapped in <AccessBarrier roles={["globalAdmin"]}>. None of the four facility-only
  // roles should reach them — the global admin from config is excluded from this matrix because
  // it isn't a facility member.
  const GLOBAL_ADMIN_PAGES = [
    "/admin/facilities",
    "/admin/users",
    "/admin/db-dumps",
    "/admin/technicals/attributes",
    "/admin/technicals/dictionaries",
  ] as const;

  for (const {label, creds, isFacilityStaffOrAdmin, isFacilityAdmin} of ROLES) {
    readOnlyTest(`${label}: every page loads or is blocked, as the role allows`, {tag: "@ui"}, async ({page}) => {
      // One page load per step, each a full boot of the app.
      readOnlyTest.setTimeout(240_000);
      await login(page, creds);
      const main = page.locator("main");
      const denial = main.getByText("no_permissions_to_view");

      // Loads the page directly by its URL, which is what puts the route's access check to work.
      async function check(url: string, landmark: Landmark | undefined) {
        await readOnlyTest.step(`${landmark ? "loads" : "blocked from"} ${url}`, async () => {
          await openPage(page, url);
          if (landmark) {
            await expect.soft(landmark(main)).toBeVisible();
            await expect.soft(denial).toHaveCount(0);
          } else {
            await expect.soft(denial).toBeVisible();
          }
        });
      }

      for (const [path, landmark] of FACILITY_PAGES) {
        await check(`/${FACILITY.url}/${path}`, isFacilityStaffOrAdmin ? landmark : undefined);
      }
      for (const [path, landmark] of FACILITY_ADMIN_PAGES) {
        await check(`/${FACILITY.url}/${path}`, isFacilityAdmin ? landmark : undefined);
      }
      // None of the facility-only roles are global admins.
      for (const path of GLOBAL_ADMIN_PAGES) {
        await check(path, undefined);
      }
    });
  }
});
