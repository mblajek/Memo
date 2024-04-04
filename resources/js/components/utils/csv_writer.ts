import * as windows1250 from "windows-1250";
import {PossiblyAsyncIterable} from "./async";

export interface WriteCSVOptions {
  readonly separator?: string;
  readonly lineEnd?: string;
  readonly excelMode?: boolean;
}

/** Exports the data to a CSV file. */
export async function writeCSV({
  writer,
  data,
  separator = ",",
  lineEnd = "\r\n",
  excelMode = false,
}: {
  writer: WritableStreamDefaultWriter;
  data: PossiblyAsyncIterable<(string | undefined)[]>;
} & WriteCSVOptions): Promise<void> {
  function writeLine(line: string) {
    if (lineEnd !== "\n") {
      line = line.replaceAll("\n", lineEnd);
    }
    return writer.write(
      excelMode ? windows1250.encode(line.replaceAll("\u2714", "ok") + lineEnd, {mode: "replacement"}) : line + lineEnd,
    );
  }
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
}
