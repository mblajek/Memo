import {expect, test, type Locator, type Page} from "@playwright/test";

interface SavedFile {
  name: string;
  chunks: number[][];
  closed: boolean;
  /** How many files the picker was asked for. */
  count: number;
}

/**
 * Stands in for the native save dialog of the File System Access API, which the exports write
 * through, with a picker that collects what is written. Call before the page is loaded. Skips the
 * test in a browser that has no such API: with the stub it would test an export nobody can make.
 */
export async function stubSaveFilePicker(page: Page) {
  test.skip(
    page.context().browser()?.browserType().name() !== "chromium",
    "The browser has no File System Access API; the app does not export there.",
  );
  await page.addInitScript(() => {
    const saved = {name: "", chunks: [] as number[][], closed: false, count: 0};
    Object.assign(window, {
      e2eSavedFile: saved,
      showSaveFilePicker: (options: {suggestedName?: string}) => {
        saved.name = options.suggestedName ?? "";
        saved.chunks.length = 0;
        saved.closed = false;
        saved.count++;
        return Promise.resolve({
          createWritable: () =>
            Promise.resolve(
              new WritableStream<string | BufferSource>({
                write(chunk) {
                  const bytes =
                    typeof chunk === "string"
                      ? new TextEncoder().encode(chunk)
                      : new Uint8Array(ArrayBuffer.isView(chunk) ? chunk.buffer : chunk);
                  saved.chunks.push([...bytes]);
                },
                close() {
                  saved.closed = true;
                },
              }),
            ),
        });
      },
    });
  });
}

/**
 * The file saved last through the stubbed picker: its suggested name, its non-empty lines and its
 * bytes. The lines are decoded as UTF-16 if the file looks like it (a BOM, or a zero second byte),
 * as UTF-8 otherwise.
 */
export async function savedFile(page: Page) {
  const saved = await page.evaluate(() => (window as unknown as {e2eSavedFile: SavedFile}).e2eSavedFile);
  const bytes = Buffer.from(saved.chunks.flat());
  const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || bytes[1] === 0;
  const lines = bytes
    .toString(utf16 ? "utf16le" : "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  return {name: saved.name, closed: saved.closed, count: saved.count, lines, bytes};
}

/**
 * Exports the table in the root to CSV through the stubbed picker: all its pages, or the one
 * shown. Returns the file once it is written.
 */
export async function exportTable(page: Page, root: Locator, pages: "all_pages" | "current_page" = "all_pages") {
  const {count} = await savedFile(page);
  await root.getByRole("button", {name: /csv_export\.label/}).click();
  await page.getByRole("button", {name: new RegExp(`tables\\.export\\.${pages}`, "i")}).click();
  await expect
    .poll(async () => {
      const file = await savedFile(page);
      return file.count > count && file.closed;
    })
    .toBe(true);
  return await savedFile(page);
}

/** The rows of a CSV text, each a list of its values: a quoted one may span lines. */
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  const pattern = /"((?:[^"]|"")*)"|([^",\r\n]*)/y;
  let pos = 0;
  while (pos < text.length) {
    pattern.lastIndex = pos;
    const [match, quoted, plain] = pattern.exec(text)!;
    row.push(quoted === undefined ? plain! : quoted.replaceAll('""', '"'));
    pos += match.length;
    if (text[pos] === ",") {
      pos++;
    } else {
      rows.push(row);
      row = [];
      pos += text.startsWith("\r\n", pos) ? 2 : 1;
    }
  }
  // The text ended right after a comma: with an empty value.
  if (row.length) {
    rows.push([...row, ""]);
  }
  return rows;
}

/** The rows of an exported table after the header row, each as its values by the column header. */
export function exportedRecords(file: {readonly bytes: Buffer}) {
  const [header, ...rows] = parseCSV(file.bytes.toString("utf8").replace(/^\uFEFF/, ""));
  return rows.map((row) => Object.fromEntries(header!.map((column, index) => [column, row[index] ?? ""])));
}
