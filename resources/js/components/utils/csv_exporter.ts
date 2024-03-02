import * as windows1250 from "windows-1250";
import {PossiblyAsyncIterable} from "./async";

/** Exports the data to a CSV file. */
export async function exportCSV({
  fileName,
  separator = ",",
  lineEnd = "\r\n",
  excelMode = false,
  data,
}: {
  fileName: string;
  separator?: string;
  lineEnd?: string;
  excelMode?: boolean;
  data: PossiblyAsyncIterable<(string | undefined)[]>;
}): Promise<{result: "done" | "cancelled"}> {
  let saveHandler;
  try {
    saveHandler = await showSaveFilePicker({
      startIn: "downloads",
      suggestedName: fileName,
      types: [{description: excelMode ? "Excel CSV" : "CSV", accept: {"text/csv": [".csv"]}}],
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {result: "cancelled"};
    }
    throw e;
  }
  const writer = (await saveHandler.createWritable()).getWriter();
  const writeLine = excelMode
    ? (line: string) =>
        writer.write(
          windows1250.encode(line.replaceAll("\n", lineEnd).replaceAll("\u2714" /* check mark */, "ok") + lineEnd, {
            mode: "replacement",
          }),
        )
    : (line: string) => writer.write(line + lineEnd);
  if (excelMode) {
    await writeLine(`sep=${separator}`);
  }
  const charactersToEscape = [...new Set([" ", ",", separator, `"`, "\n"])];
  function format(value: string) {
    if (charactersToEscape.some((c) => value.includes(c))) {
      return `"${value.replaceAll(`"`, `""`)}"`;
    }
    return value;
  }
  try {
    for await (const row of data)
      await writeLine(row.map((cell) => (cell === undefined ? "" : format(cell))).join(separator));
    await writer.close();
  } catch (e) {
    writer.abort();
    throw e;
  }
  return {result: "done"};
}
