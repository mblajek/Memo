import {seededDays} from "../helpers/meetings.ts";
import type {Locator, Page} from "@playwright/test";
import {expectCalendarMode, meetingBlocks} from "../helpers/calendar.ts";
import {FACILITY, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {savedFile, stubSaveFilePicker} from "../helpers/saved_file.ts";
import {allTableRows, chooseInFormSelect, formField, submitButton, tableRows} from "../helpers/selectors.ts";
import {expect, login, openPage, readOnlyTest, test} from "../lib/test.ts";
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

const columnHeader = (main: Locator, column: string) => main.locator(`[data-header-for-column="${column}"]`);
/** The button clearing the column's filter; present only while the filter is set. */
const clearFilterButton = (main: Locator, column: string) =>
  columnHeader(main, column).locator('[aria-description^="tables.filter.filter_set"]');

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
      const column = (name: string) =>
        page.getByRole("checkbox", {name: `tables.tables.meeting.column_names.${name}`, exact: true});
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

      async function exportAll(format: "csv" | "excel_csv", extension: string) {
        await main.getByRole("button", {name: /csv_export\.label/}).click();
        await page.getByText(`csv_export.format.${format}`, {exact: true}).click();
        // With everything on one page the only item is the "all pages" one.
        await page.getByRole("button", {name: /tables\.export\.all_pages/i}).click();
        await expect(page.getByText("csv_export.success").first()).toBeVisible();
        // The toast of the previous export may still be there: wait for this export's file.
        await expect
          .poll(async () => {
            const file = await savedFile(page);
            return file.closed && file.name.endsWith(extension);
          })
          .toBe(true);
        return await savedFile(page);
      }

      const csv = await exportAll("csv", ".csv");
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

      const excel = await exportAll("excel_csv", ".excel.csv");
      expect(excel.closed).toBe(true);
      expect(excel.name).toMatch(/\.excel\.csv$/);
      // The Excel format starts with a line naming the separator.
      expect(excel.lines).toHaveLength(13);
      expect(excel.lines[0]).toBe("sep=,");
      expect(linesOf(excel.lines, "staff", STAFF_ADMIN.name)).toHaveLength(1);
      expect(linesOf(excel.lines, "staff", STAFF.name)).toHaveLength(4);
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
