import {seededDays} from "../helpers/meetings.ts";
import type {Locator, Page} from "@playwright/test";
import {expectCalendarMode, meetingBlocks} from "../helpers/calendar.ts";
import {shownDate, shownTableDate} from "../helpers/dates.ts";
import {ADMIN, FACILITY, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {meetingsListTab, shownTableRows} from "../helpers/meetings.ts";
import {cloneMeeting} from "../helpers/queries.ts";
import {exportTable, exportedRecords, savedFile, stubSaveFilePicker} from "../helpers/saved_file.ts";
import {
  allTableRows,
  chooseInFormSelect,
  clearFilterButton,
  columnHeader,
  formField,
  showTableColumns,
  submitButton,
  tableCell,
  tableCellTexts,
  tableRows,
  collapseSpaces,
  columnChooserBox,
  clickOutside,
} from "../helpers/selectors.ts";
import {addDays} from "../lib/dates.ts";
import {expect, login, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";
import {responseData} from "../lib/responses.ts";

/**
 * UI tests of the meetings reports: the tables of meetings, of meeting attendants and of meeting
 * clients. They list the regular meetings only: of the five seeded ones, not the short meeting,
 * whose type is in the system category.
 */

async function openTable(page: Page, path: string) {
  await openPage(page, `/${FACILITY.url}/${path}`);
  return page.locator("main");
}

/** The buttons of the pages of the table in the root: the numbers, between the two arrows. */
const pageButton = (root: Locator, pageNumber: number) =>
  root.getByRole("button", {name: String(pageNumber), exact: true});

meetingsLayer.describe((artifact) => {
  const seededDay = seededDays(artifact);

  readOnlyTest(
    "the meetings list shows the regular meetings, latest first, and filters them",
    {tag: "@ui"},
    async ({page}) => {
      const {adultClientInfos} = artifact();
      const [adam, bea, carl, diana, eve] = adultClientInfos.map((c) => c.name);
      await login(page, STAFF);
      const main = await openTable(page, "meetings");
      const rows = allTableRows(main);
      const summary = (count: number) => main.getByText(`tables.tables.meeting.summary{count:${count}}`);
      // The row order is given by the clients: future, group (tomorrow), today, past.
      const expectRows = async (...clients: readonly string[]) => {
        await expect(rows).toHaveCount(clients.length);
        for (const [index, client] of clients.entries()) {
          await expect(rows.nth(index)).toContainText(client);
        }
        await expect(summary(clients.length)).toBeVisible();
      };

      await expectRows(carl!, diana!, bea!, adam!);
      await expect(main.getByText(eve!)).toHaveCount(0);
      await expect(tableRows(main, diana!)).toContainText(STAFF_ADMIN.name);
      await expect(tableRows(main, diana!)).toContainText("Integration Test Therapy");
      await expect(tableRows(main, adam!)).toContainText("dictionary.meetingStatus.completed");

      await test.step("sorting by date", async () => {
        await columnHeader(main, "date")
          .getByRole("button", {name: /column_names\.date/})
          .click();
        await expectRows(adam!, bea!, diana!, carl!);
        await columnHeader(main, "date")
          .getByRole("button", {name: /column_names\.date/})
          .click();
        await expectRows(carl!, diana!, bea!, adam!);
      });

      await test.step("date range filter", async () => {
        await formField(main, "table.filter.from_date").fill(seededDay(0));
        await expectRows(carl!, diana!, bea!);
        await formField(main, "table.filter.to_date").fill(seededDay(1));
        await expectRows(diana!, bea!);
      });

      await test.step("type filter, on top of the date range", async () => {
        await chooseInFormSelect(page, "table.filter.val_typeDictId", /Integration Test Therapy/);
        await expectRows(diana!);
        await clearFilterButton(main, "date").click();
        await expect(formField(main, "table.filter.from_date")).toHaveValue("");
        await expectRows(diana!);
        await clearFilterButton(main, "typeDictId").click();
        await expectRows(carl!, diana!, bea!, adam!);
      });

      await test.step("staff filter", async () => {
        await chooseInFormSelect(page, "table.filter.val_staff.*.userId", new RegExp(STAFF_ADMIN.name));
        await expectRows(diana!);
        await clearFilterButton(main, "staff.*.userId").click();
        await expectRows(carl!, diana!, bea!, adam!);
      });

      await test.step("text search", async () => {
        await main.getByRole("textbox", {name: "actions.search"}).fill("therapy");
        await expectRows(diana!);
      });
    },
  );

  readOnlyTest(
    "columns of the meetings list are shown and hidden in the column chooser",
    {tag: "@ui"},
    async ({page}) => {
      await login(page, STAFF);
      const main = await openTable(page, "meetings");
      const column = (name: string) => columnChooserBox(page, "meeting", name);
      await expect(allTableRows(main)).toHaveCount(4);
      await expect(columnHeader(main, "isRemote")).toBeVisible();
      await expect(columnHeader(main, "durationMinutes")).toHaveCount(0);

      await main.getByRole("button", {name: "tables.choose_columns"}).click();
      await expect(column("isRemote")).toBeChecked();
      await expect(column("durationMinutes")).not.toBeChecked();
      await column("isRemote").uncheck();
      await column("durationMinutes").check();
      await expect(columnHeader(main, "isRemote")).toHaveCount(0);
      await expect(columnHeader(main, "durationMinutes")).toBeVisible();
      // The seeded meetings take an hour, the group one an hour and a half.
      await expect(allTableRows(main).getByText("60", {exact: true})).toHaveCount(3);
      await expect(allTableRows(main).getByText("90", {exact: true})).toHaveCount(1);

      await test.step("the choice survives a reload", async () => {
        await page.reload();
        await disableTranslations(page);
        await expect(columnHeader(main, "durationMinutes")).toBeVisible();
        await expect(columnHeader(main, "isRemote")).toHaveCount(0);
      });

      await test.step("restoring the defaults", async () => {
        await main.getByRole("button", {name: "tables.choose_columns"}).click();
        await page.getByRole("button", {name: "actions.restore_default"}).click();
        await expect(columnHeader(main, "isRemote")).toBeVisible();
        await expect(columnHeader(main, "durationMinutes")).toHaveCount(0);
        await expect(column("isRemote")).toBeChecked();
      });
    },
  );

  // The widths are kept in the browser, like the choice of the columns.
  readOnlyTest("a column is resized by dragging the edge of its header", {tag: "@ui"}, async ({page}) => {
    await login(page, STAFF);
    const main = await openTable(page, "meetings");
    await expect(allTableRows(main)).toHaveCount(4);
    const header = columnHeader(main, "date");
    const width = async () => (await header.boundingBox())!.width;
    const initialWidth = await width();

    const box = (await header.boundingBox())!;
    await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width + 80, box.y + box.height / 2, {steps: 8});
    await page.mouse.up();
    await expect.poll(width).toBeGreaterThan(initialWidth + 60);
    const resizedWidth = await width();

    await test.step("the width survives a reload", async () => {
      // The size is stored a moment after it changes, more than once during a drag: wait for the
      // stored one to settle, or the reload may bring back a width from the middle of the drag.
      const storedSize = () =>
        page.evaluate(
          () =>
            Object.values(localStorage)
              .map((value) => /"colSize":\{"date":([\d.]+)/.exec(value)?.[1])
              .find(Boolean) ?? null,
        );
      let lastStored: string | null = null;
      await expect
        .poll(
          async () => {
            const previous = lastStored;
            lastStored = await storedSize();
            return lastStored !== null && lastStored === previous;
          },
          {intervals: [500]},
        )
        .toBe(true);
      await page.reload();
      await disableTranslations(page);
      await expect(allTableRows(main)).toHaveCount(4);
      await expect.poll(width).toBeCloseTo(resizedWidth, 0);
    });

    await test.step("the widths are reset in the column chooser", async () => {
      await main.getByRole("button", {name: "tables.choose_columns"}).click();
      const resetSizes = page.getByRole("button", {name: "tables.reset_column_sizes"});
      await resetSizes.click();
      await expect.poll(width).toBeCloseTo(initialWidth, 0);
      await expect(resetSizes).toBeDisabled();
    });
  });

  readOnlyTest(
    "a row's details button opens that meeting, which links to its place in the calendar",
    {tag: "@ui"},
    async ({page}) => {
      const {groupMeeting, adultClientInfos, childClientInfos} = artifact();
      await login(page, STAFF);
      const main = await openTable(page, "meetings");
      await tableRows(main, adultClientInfos[3]!.name).getByRole("button", {name: "actions.details"}).click();
      await expect(page.getByRole("heading", {name: /models\.meeting\._name/i})).toBeVisible();
      const form = page.locator("#meeting_edit");
      for (const client of [adultClientInfos[3]!, childClientInfos[0]!, childClientInfos[1]!]) {
        await expect(form.getByRole("link", {name: client.name})).toBeVisible();
      }
      await expect(form.getByRole("link", {name: STAFF_ADMIN.name})).toBeVisible();

      await page.getByRole("link", {name: "meetings.show_in_calendar"}).click();
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/calendar$`));
      await expectCalendarMode(page, "week");
      await expect(meetingBlocks(page, groupMeeting.id)).toBeVisible();
      await expect(page.locator("main").getByRole("radio", {name: STAFF.name, exact: true})).toBeChecked();
    },
  );

  test("a meeting is deleted with its row's delete button", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, futureMeeting, adultClientInfos} = artifact();
    const carl = adultClientInfos[2]!.name;
    await login(page, STAFF);
    const main = await openTable(page, "meetings");
    await expect(allTableRows(main)).toHaveCount(4);
    await tableRows(main, carl).getByRole("button", {name: "actions.delete"}).click();
    await expect(page.getByRole("heading", {name: "forms.meeting_delete.form_name"})).toBeVisible();
    await submitButton(page, "meeting_delete").click();
    await expect(page.getByText(/forms\.meeting_delete\.success/)).toBeVisible();
    await expect(allTableRows(main)).toHaveCount(3);
    await expect(tableRows(main, carl)).toHaveCount(0);
    const staffApi = await api.loggedInAs(STAFF);
    const res = await staffApi.get(`facility/${facilityId}/meeting/list?in=${futureMeeting.id}`);
    expect(await responseData<unknown[]>(res)).toEqual([]);
  });

  readOnlyTest("the attendants report has a row per attendant of each meeting", {tag: "@ui"}, async ({page}) => {
    const {adultClientInfos, childClientInfos} = artifact();
    await login(page, STAFF);
    const main = await openTable(page, "meeting-attendants");
    const rows = allTableRows(main);
    const summary = (count: number) => main.getByText(`tables.tables.meeting_multi_attendant.summary{count:${count}}`);
    // Three meetings of one staff member and one client; the group meeting of two and three.
    await expect(summary(11)).toBeVisible();
    await expect(rows).toHaveCount(11);
    const attendantCell = (name: string) =>
      rows.filter({
        has: page.locator('[role="cell"][data-column="attendant.userId"]').getByRole("link", {name, exact: true}),
      });
    await expect(attendantCell(STAFF.name)).toHaveCount(4);
    await expect(attendantCell(STAFF_ADMIN.name)).toHaveCount(1);
    for (const client of [...adultClientInfos.slice(0, 4), ...childClientInfos.slice(0, 2)]) {
      await expect(attendantCell(client.name), client.name).toHaveCount(1);
    }
    await expect(attendantCell(adultClientInfos[4]!.name)).toHaveCount(0);

    await test.step("filter by the kind of attendant", async () => {
      await chooseInFormSelect(page, "table.filter.val_attendant.attendanceTypeDictId", /attendanceType\.client/);
      await expect(summary(6)).toBeVisible();
      await expect(rows).toHaveCount(6);
      await expect(attendantCell(STAFF.name)).toHaveCount(0);
      await clearFilterButton(main, "attendant.attendanceTypeDictId").click();
      await expect(summary(11)).toBeVisible();
    });

    await test.step("filter by the attendant", async () => {
      await chooseInFormSelect(page, "table.filter.val_attendant.userId", new RegExp(STAFF_ADMIN.name));
      await expect(summary(1)).toBeVisible();
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText("Integration Test Therapy");
    });
  });

  readOnlyTest(
    "the clients report has a row per client of each meeting, with the client's data",
    {tag: "@ui"},
    async ({page}) => {
      const {adultClientInfos, childClientInfos} = artifact();
      await login(page, STAFF);
      const main = await openTable(page, "meeting-clients");
      const rows = allTableRows(main);
      const summary = (count: number) => main.getByText(`tables.tables.meeting_client.summary{count:${count}}`);
      await expect(summary(6)).toBeVisible();
      await expect(rows).toHaveCount(6);
      // The second staff member is in the group meeting only, which has three clients.
      await expect(rows.filter({hasText: STAFF_ADMIN.name})).toHaveCount(3);
      const [carl, diana] = [adultClientInfos[2]!.name, adultClientInfos[3]!.name];
      // The clients' own columns: Carl is the one with a city.
      await expect(tableRows(main, "Warszawa")).toHaveCount(1);
      await expect(tableRows(main, "Warszawa")).toContainText(carl);

      await test.step("filter by the client type", async () => {
        await chooseInFormSelect(page, "table.filter.val_client.typeDictId", /clientType\.child/);
        await expect(summary(2)).toBeVisible();
        for (const child of childClientInfos.slice(0, 2)) {
          await expect(rows.filter({hasText: child.name})).toHaveCount(2);
        }
        // Both children are in the group meeting, so each row names them both, and Diana.
        await expect(rows.filter({hasText: diana})).toHaveCount(2);
        await clearFilterButton(main, "client.typeDictId").click();
        await expect(summary(6)).toBeVisible();
      });

      await test.step("filter by the client's city", async () => {
        await formField(main, "table.filter.val_client.addressCity").fill("warsz");
        await expect(summary(1)).toBeVisible();
        await expect(rows).toContainText(carl);
      });
    },
  );

  readOnlyTest(
    "the attendants report exports to CSV, a line per attendant, in both formats",
    {tag: "@ui"},
    async ({page}) => {
      await stubSaveFilePicker(page);
      await login(page, STAFF);
      const main = await openTable(page, "meeting-attendants");
      await expect(main.getByText("tables.tables.meeting_multi_attendant.summary{count:11}")).toBeVisible();

      async function exportAll(format: "csv" | "excel_csv") {
        await main.getByRole("button", {name: /csv_export\.label/}).click();
        await page.getByText(`csv_export.format.${format}`, {exact: true}).click();
        // The format is kept; the menu is opened anew for the export.
        await clickOutside(page);
        return await exportTable(page, main);
      }

      const csv = await exportAll("csv");
      expect(csv.closed).toBe(true);
      expect(csv.name).toMatch(/\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
      expect(csv.name).not.toMatch(/\.excel\.csv$/);
      // A header line, then the 11 attendants: four meetings of STAFF, five people on the group one.
      expect(csv.lines).toHaveLength(12);
      expect(csv.lines[0]).toMatch(/column_names\.attendant/i);
      // Each line starts with the kind and the name of the attendant, and names the others further on.
      const linesOf = (lines: readonly string[], kind: string, name: string) =>
        lines.filter((line) => new RegExp(`^"?dictionary\\.attendanceType\\.${kind}"?\\W{1,3}${name}\\W`).test(line));
      expect(linesOf(csv.lines, "staff", STAFF.name)).toHaveLength(4);
      expect(linesOf(csv.lines, "client", "Diana Wisniewski")).toHaveLength(1);
      expect(csv.lines.slice(1).filter((line) => line.includes("Integration Test Therapy"))).toHaveLength(5);
      expect(csv.lines.join("\n")).not.toContain("Integration Test Consult");

      const excel = await exportAll("excel_csv");
      expect(excel.closed).toBe(true);
      expect(excel.name).toMatch(/\.excel\.csv$/);
      // The Excel format starts with a line naming the separator.
      expect(excel.lines).toHaveLength(13);
      expect(excel.lines[0]).toBe("sep=,");
      expect(linesOf(excel.lines, "staff", STAFF_ADMIN.name)).toHaveLength(1);
      expect(linesOf(excel.lines, "staff", STAFF.name)).toHaveLength(4);
    },
  );

  readOnlyTest("the export of the meetings list has the values of each kind as texts", {tag: "@ui"}, async ({page}) => {
    const {groupMeeting, pastMeeting, adultClientInfos, childClientInfos} = artifact();
    await stubSaveFilePicker(page);
    await login(page, STAFF);
    const main = await openTable(page, "meetings");
    await expect(allTableRows(main)).toHaveCount(4);
    const column = (name: string) => `Tables.tables.meeting.column_names.${name}`;
    const records = exportedRecords(await exportTable(page, main));
    // In the order of the table: the latest first.
    const groupClients = [adultClientInfos[3]!, childClientInfos[0]!, childClientInfos[1]!]
      .map(({name}) => name)
      .join(", ");
    expect(records.map((record) => record[column("clients.*.userId")])).toEqual([
      adultClientInfos[2]!.name,
      groupClients,
      adultClientInfos[1]!.name,
      adultClientInfos[0]!.name,
    ]);
    // Only the columns shown. A meeting of no series has a "no" where the table has a dash.
    expect(records[1]).toEqual({
      [column("date")]: shownDate(groupMeeting.date),
      [column("startDayminute")]: "12:00-13:30",
      [column("isClone")]: "bool_values.no",
      [column("typeDictId")]: expect.stringContaining("Integration Test Therapy"),
      [column("statusDictId")]: "dictionary.meetingStatus.planned",
      [column("staff.*.userId")]: `${STAFF.name}, ${STAFF_ADMIN.name}`,
      [column("clients.*.userId")]: groupClients,
      [column("isRemote")]: "bool_values.no",
      [column("notes")]: "",
      [column("resources.*.dictId")]: "",
    });
    expect(records[3]).toMatchObject({
      [column("date")]: shownDate(pastMeeting.date),
      [column("statusDictId")]: "dictionary.meetingStatus.completed",
      [column("staff.*.userId")]: STAFF.name,
    });
  });

  readOnlyTest(
    "the staff and the clients tables count the meetings of each person, and date the completed ones",
    {tag: "@ui"},
    async ({page}) => {
      const {pastMeeting, adultClientInfos, childClientInfos} = artifact();
      const [adam, bea, , diana, eve] = adultClientInfos;
      // The columns of the meetings but for those of the last and the next month, which the server
      // counts from its own date.
      const columns = ["firstMeetingDate", "lastMeetingDate", "completedMeetingsCount", "plannedMeetingsCount"];
      const cells = (first: string, last: string, completed: number, planned: number) => ({
        firstMeetingDate: first,
        lastMeetingDate: last,
        completedMeetingsCount: String(completed),
        plannedMeetingsCount: String(planned),
      });
      const pastDay = shownTableDate(pastMeeting.date);
      await login(page, STAFF);

      const staff = await openTable(page, "staff");
      await showTableColumns(page, staff, "staff", columns);
      // The past meeting is completed; today's, the group one and the one in a week are planned.
      // The meeting of the system category is not counted.
      await expect
        .poll(() => tableCellTexts(tableRows(staff, STAFF.name), columns))
        .toEqual(cells(pastDay, pastDay, 1, 3));
      await expect
        .poll(() => tableCellTexts(tableRows(staff, STAFF_ADMIN.name), columns))
        .toEqual(cells("—", "—", 0, 1));

      const clients = await openTable(page, "clients");
      await showTableColumns(page, clients, "client", columns);
      const clientCells = (name: string) => tableCellTexts(tableRows(clients, name), columns);
      await expect.poll(() => clientCells(adam!.name)).toEqual(cells(pastDay, pastDay, 1, 0));
      await expect.poll(() => clientCells(bea!.name)).toEqual(cells("—", "—", 0, 1));
      await expect.poll(() => clientCells(diana!.name)).toEqual(cells("—", "—", 0, 1));
      await expect.poll(() => clientCells(eve!.name)).toEqual(cells("—", "—", 0, 0));
      await expect.poll(() => clientCells(childClientInfos[4]!.name)).toEqual(cells("—", "—", 0, 0));
    },
  );

  test(
    "a long list of meetings is paged, fifty on a page; a list on a details page ten on a page",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, futureMeeting, staffUserId, adultClientInfos} = artifact();
      const carl = adultClientInfos[2]!;
      const staffApi = await api.loggedInAs(STAFF);
      // 52 more meetings of Carl, a day after another: 56 regular meetings in all.
      const dates = Array.from({length: 52}, (_, index) => addDays(futureMeeting.date, index + 1));
      await cloneMeeting(staffApi, facilityId, futureMeeting.id, dates, "1d");
      await login(page, STAFF);
      const main = await openTable(page, "meetings");
      const rows = allTableRows(main);
      const shownDates = async () => (await tableCell(rows, "date").allInnerTexts()).map(collapseSpaces);

      await test.step("the first page has the latest fifty", async () => {
        await expect(main.getByText("tables.tables.meeting.summary{count:56}")).toBeVisible();
        await expect(rows).toHaveCount(50);
        await expect(pageButton(main, 2)).toBeVisible();
        await expect(pageButton(main, 3)).toHaveCount(0);
        expect((await shownDates())[0]).toBe(shownTableDate(dates.at(-1)!));
      });

      await test.step("the second page has the rest", async () => {
        await pageButton(main, 2).click();
        await expect(rows).toHaveCount(6);
        await expect(main.getByText("tables.tables.meeting.summary{count:56}")).toBeVisible();
        // The earliest two clones, then the meetings of the layer.
        expect((await shownDates()).slice(0, 3)).toEqual(
          [dates[1]!, dates[0]!, futureMeeting.date].map(shownTableDate),
        );
      });

      await test.step("the arrows lead to the previous and the next page", async () => {
        const previous = pageButton(main, 1).locator("xpath=preceding-sibling::button[1]");
        const next = pageButton(main, 2).locator("xpath=following-sibling::button[1]");
        await expect(next).toBeDisabled();
        await previous.click();
        await expect(rows).toHaveCount(50);
        await expect(previous).toBeDisabled();
        await next.click();
        await expect(rows).toHaveCount(6);
      });

      await test.step("a filter that leaves one page takes the page buttons away", async () => {
        await formField(main, "table.filter.to_date").fill(dates[1]!);
        await expect(main.getByText("tables.tables.meeting.summary{count:6}")).toBeVisible();
        await expect(rows).toHaveCount(6);
        await expect(pageButton(main, 1)).toHaveCount(0);
      });

      await test.step("the planned meetings of the staff member: ten on a page", async () => {
        await openPage(page, `/${FACILITY.url}/staff/${staffUserId}`);
        await expect(meetingsListTab(page, "planned")).toHaveAttribute("aria-selected", "true");
        // Today's, the group one, the one in a week and its 52 copies.
        await expect(shownTableRows(page)).toHaveCount(10);
        await expect(pageButton(main, 6)).toBeVisible();
        await expect(pageButton(main, 7)).toHaveCount(0);
        await pageButton(main, 6).click();
        await expect(shownTableRows(page)).toHaveCount(5);
      });

      await test.step("the client's tab counts them all", async () => {
        await openPage(page, `/${FACILITY.url}/clients/${carl.id}`);
        await expect(meetingsListTab(page, "planned")).toContainText(/meetings_lists\.planned — 53(\D|$)/i);
        await expect(shownTableRows(page)).toHaveCount(10);
      });
    },
  );

  test("the export of a paged list is of the page shown, or of all the pages", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, futureMeeting} = artifact();
    const dates = Array.from({length: 52}, (_, index) => addDays(futureMeeting.date, index + 1));
    await cloneMeeting(await api.loggedInAs(STAFF), facilityId, futureMeeting.id, dates, "1d");
    await stubSaveFilePicker(page);
    await login(page, STAFF);
    const main = await openTable(page, "meetings");
    await expect(allTableRows(main)).toHaveCount(50);
    expect(exportedRecords(await exportTable(page, main, "current_page"))).toHaveLength(50);
    expect(exportedRecords(await exportTable(page, main, "all_pages"))).toHaveLength(56);
    await pageButton(main, 2).click();
    await expect(allTableRows(main)).toHaveCount(6);
    expect(exportedRecords(await exportTable(page, main, "current_page"))).toHaveLength(6);
  });

  const NOTES_LINK = "https://example.com/e2e-notes";
  const LONG_NOTES = [
    ...Array.from({length: 40}, (_, index) => `Line ${index + 1} of the notes`),
    `See ${NOTES_LINK} too`,
  ].join("\n");
  const setLongNotes = async (api: MemoAPI) =>
    (await api.loggedInAs(STAFF)).patchMeeting(artifact().facilityId, artifact().pastMeeting.id, {notes: LONG_NOTES});

  test("a long text scrolls inside its cell, with its links working", {tag: "@ui"}, async ({page, api}) => {
    await setLongNotes(api);
    await login(page, STAFF);
    const main = await openTable(page, "meetings");
    const rows = allTableRows(main);
    await expect(rows).toHaveCount(4);
    const cell = tableCell(tableRows(main, artifact().adultClientInfos[0]!.name), "notes");
    await expect(cell).toContainText("Line 40 of the notes");
    await expect(cell.getByRole("link", {name: NOTES_LINK})).toHaveAttribute("href", NOTES_LINK);
    // The row is not much higher than the others: the text scrolls in a box of its own.
    const scrolling = cell.locator("div").filter({hasText: "Line 1 of the notes"}).first();
    const sizes = await scrolling.evaluate((box) => ({shown: box.clientHeight, whole: box.scrollHeight}));
    expect(sizes.whole).toBeGreaterThan(sizes.shown * 3);
    const height = async (locator: Locator) => (await locator.boundingBox())!.height;
    expect(await height(cell)).toBeLessThan(4 * (await height(tableCell(rows.first(), "notes"))));
  });

  test("a long text is exported whole", {tag: "@ui"}, async ({page, api}) => {
    await setLongNotes(api);
    await stubSaveFilePicker(page);
    await login(page, STAFF);
    const main = await openTable(page, "meetings");
    await expect(allTableRows(main)).toHaveCount(4);
    const records = exportedRecords(await exportTable(page, main));
    // The lines of a value end as the lines of the file do.
    expect(
      records.map((record) => record["Tables.tables.meeting.column_names.notes"]!.replaceAll("\r\n", "\n")),
    ).toEqual(["", "", "", LONG_NOTES]);
  });

  readOnlyTest(
    "the rows of a report are grouped by the attendant, by the meeting or by a column, each group with its count",
    {tag: "@ui"},
    async ({page}) => {
      const {adultClientInfos} = artifact();
      await login(page, STAFF);
      const main = await openTable(page, "meeting-attendants");
      const rows = allTableRows(main);
      await expect(rows).toHaveCount(11);
      await expect(columnHeader(main, "_count")).toHaveCount(0);
      const GROUPED = "tables.column_groups.grouping_symbol";
      const groupBy = (group: string) =>
        chooseInFormSelect(page, "columnGroup", new RegExp(`column_groups\\.${group.replaceAll(".", "\\.")}$`));
      const expectGroups = async (group: string, count: number) => {
        await expect(
          main.getByText(`tables.tables.meeting_multi_attendant.with_column_group.${group}.summary{count:${count}}`),
        ).toBeVisible();
        await expect(rows).toHaveCount(count);
      };
      const cells = (row: Locator, ...columns: readonly string[]) => tableCellTexts(row, columns);

      await test.step("by the attendant: the columns of the meeting have no values", async () => {
        await groupBy("attendant_multicolumn");
        await expectGroups("attendant_multicolumn", 8);
        expect(await cells(tableRows(main, STAFF.name), "_count", "attendant.attendanceTypeDictId", "date")).toEqual({
          "_count": `${GROUPED} 4`,
          "attendant.attendanceTypeDictId": "dictionary.attendanceType.staff",
          "date": GROUPED,
        });
        for (const name of [STAFF_ADMIN.name, ...adultClientInfos.slice(0, 4).map((client) => client.name)]) {
          expect(await cells(tableRows(main, name), "_count", "typeDictId"), name).toEqual({
            _count: `${GROUPED} 1`,
            typeDictId: GROUPED,
          });
        }
      });

      await test.step("by the meeting: the columns of the attendant have no values", async () => {
        await groupBy("meeting_multicolumn");
        await expectGroups("meeting_multicolumn", 4);
        // The latest first: the meeting in a week, the group one, today's, the past one.
        expect(await tableCell(rows, "_count").allInnerTexts()).toEqual(
          [2, 5, 2, 2].map((count) => expect.stringMatching(new RegExp(`^${GROUPED}\\s+${count}$`))),
        );
        expect(await cells(tableRows(main, "Integration Test Therapy"), "attendant.userId", "statusDictId")).toEqual({
          "attendant.userId": GROUPED,
          "statusDictId": "dictionary.meetingStatus.planned",
        });
      });

      await test.step("by a column: the meeting type", async () => {
        await groupBy("typeDictId");
        await expectGroups("typeDictId", 2);
        expect(await cells(tableRows(main, "Integration Test Therapy"), "_count", "date")).toEqual({
          _count: `${GROUPED} 5`,
          date: GROUPED,
        });
        expect(await cells(tableRows(main, "dictionary.meetingType.other"), "_count")).toEqual({
          _count: `${GROUPED} 6`,
        });
      });

      await test.step("no grouping again", async () => {
        await chooseInFormSelect(page, "columnGroup", "tables.column_groups.no_grouping");
        await expect(main.getByText("tables.tables.meeting_multi_attendant.summary{count:11}")).toBeVisible();
        await expect(rows).toHaveCount(11);
        await expect(columnHeader(main, "_count")).toHaveCount(0);
      });
    },
  );

  // In Polish, as the help is.
  readOnlyTest(
    "the reports page leads to the help of the reports, which links to each report; a report explains itself",
    {tag: "@ui"},
    async ({page}) => {
      await login(page, ADMIN);
      await page.goto(`/${FACILITY.url}/admin/reports`);
      const main = page.locator("main");
      await expect(main.getByText("Wybierz raport z menu")).toBeVisible();
      await main.getByRole("link", {name: "Więcej informacji o dostępnych raportach"}).click();
      await expect(page).toHaveURL(/\/help\/reports$/);
      await expect(main.getByRole("heading", {level: 1, name: "Raporty", exact: true})).toBeVisible();

      // The help names no facility in its links.
      await main.getByRole("link", {name: "/«placówka»/meeting-attendants"}).click();
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/meeting-attendants$`));
      await expect(allTableRows(main)).toHaveCount(11);

      await main.locator("title=Kliknij aby dowiedzieć się więcej o tej tabeli").click();
      await expect(page.getByText("Ten raport pokazuje wszystkie uczestnictwa w spotkaniach")).toBeVisible();
      const fullPageLink = page.getByRole("link", {name: "Otwórz pełną stronę pomocy"});
      await expect(fullPageLink).toHaveAttribute("href", "/help/reports#meeting-attendants");
      await fullPageLink.click();
      await expect(page).toHaveURL(/\/help\/reports#meeting-attendants$/);
      await expect(main.getByRole("heading", {level: 1, name: "Raporty", exact: true})).toBeVisible();
    },
  );

  // `writeCSV` hands the file a `Uint16Array` from the windows-1250 encoder: two bytes per character.
  test.fixme("the Excel CSV export is written in windows-1250, a byte per character", {tag: "@ui"}, async ({page}) => {
    await stubSaveFilePicker(page);
    await login(page, STAFF);
    const main = await openTable(page, "meeting-attendants");
    await expect(main.getByText("tables.tables.meeting_multi_attendant.summary{count:11}")).toBeVisible();
    await main.getByRole("button", {name: /csv_export\.label/}).click();
    await page.getByText("csv_export.format.excel_csv", {exact: true}).click();
    await page.getByRole("button", {name: /tables\.export\.all_pages/i}).click();
    await expect.poll(async () => (await savedFile(page)).closed).toBe(true);
    const {bytes} = await savedFile(page);
    expect(bytes.subarray(0, 7).toString("latin1")).toBe("sep=,\r\n");
    expect(bytes.includes(0)).toBe(false);
  });
});
