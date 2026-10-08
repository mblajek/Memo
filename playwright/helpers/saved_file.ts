import {test, type Page} from "@playwright/test";

interface SavedFile {
  name: string;
  chunks: number[][];
  closed: boolean;
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
    const saved = {name: "", chunks: [] as number[][], closed: false};
    Object.assign(window, {
      e2eSavedFile: saved,
      showSaveFilePicker: (options: {suggestedName?: string}) => {
        saved.name = options.suggestedName ?? "";
        saved.chunks.length = 0;
        saved.closed = false;
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
  return {name: saved.name, closed: saved.closed, lines, bytes};
}
