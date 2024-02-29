import {PossiblyAsyncIterable} from "./async";

const BUFFER_SIZE = 10000;

/** Buffers the writes to speed up saving the file. */
class BufferedWriter {
  private readonly buffer: string[] = [];
  private totalLength = 0;

  constructor(private readonly writer: WritableStreamDefaultWriter<string>) {}

  async write(data: string) {
    this.buffer.push(data);
    this.totalLength += data.length;
    if (this.totalLength >= BUFFER_SIZE) {
      await this.flush();
    }
  }

  async close() {
    await this.flush();
    await this.writer.close();
  }

  abort() {
    this.writer.abort();
  }

  private async flush() {
    await this.writer.write(this.buffer.join(""));
    this.buffer.length = 0;
    this.totalLength = 0;
  }
}

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
  const writer = new BufferedWriter((await saveHandler.createWritable()).getWriter());
  const charactersToEscape = [...new Set([" ", ",", separator, `"`, "\n"])];
  function format(value: string) {
    if (charactersToEscape.some((c) => value.includes(c))) {
      return `"${value.replaceAll(`"`, `""`)}"`;
    }
    return value;
  }
  try {
    for await (const row of data)
      await writer.write(row.map((cell) => (cell === undefined ? "" : format(cell))).join(separator) + lineEnd);
    await writer.close();
  } catch (e) {
    writer.abort();
    throw e;
  }
  return {result: "done"};
}
