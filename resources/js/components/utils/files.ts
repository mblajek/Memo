export async function pickSaveFile(
  pickerOptions: SaveFilePickerOptions,
  openOptions?: FileSystemCreateWritableOptions,
): Promise<WritableStreamDefaultWriter | "cancelled"> {
  let saveHandler;
  try {
    saveHandler = await window.showSaveFilePicker(pickerOptions);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return "cancelled";
    }
    throw e;
  }
  return (await saveHandler.createWritable(openOptions)).getWriter();
}

export function isPickSaveFileSupported() {
  return !!window.showSaveFilePicker;
}
