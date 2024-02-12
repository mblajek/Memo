import {PossiblyAsyncIterable} from "./async";

/** Exports the data to a CSV file. */
export async function exportCSV({
  fileName,
  separator = ",",
  lineEnd = "\r\n",
  data,
}: {
  fileName: string;
  separator?: string;
  lineEnd?: string;
  data: PossiblyAsyncIterable<(string | undefined)[]>;
}): Promise<{result: "done" | "cancelled"}> {
  let saveHandler;
  try {
    saveHandler = await showSaveFilePicker({
      startIn: "downloads",
      suggestedName: fileName,
      types: [{description: "CSV", accept: {"text/csv": [".csv"]}}],
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {result: "cancelled"};
    }
    throw e;
  }
  const writer = (await saveHandler.createWritable()).getWriter();
  const charactersToEscape = [...new Set([separator, ",", `"`, " ", "\n"])];
  function format(value: string) {
    if (charactersToEscape.some((c) => value.includes(c))) {
      return `"${value.replaceAll(`"`, `""`)}"`;
    }
    return value;
  }
  try {
    for await (const row of data) {
      for (let i = 0; i < row.length; i++) {
        if (i) {
          await writer.write(separator);
        }
        const cell = row[i];
        if (cell !== undefined) {
          await writer.write(format(cell));
        }
      }
      await writer.write(lineEnd);
    }
    writer.close();
  } catch (e) {
    writer.abort();
    throw e;
  }
  return {result: "done"};
}
