import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {WriteCSVOptions} from "components/utils/csv_writer";
import {useLangFunc} from "components/utils/lang";
import {createComputed, createSignal, VoidComponent} from "solid-js";

interface CSVExportModeFragment {
  readonly id: string;
  readonly extension: `.${string}`;
  readonly writeCSVOptions?: WriteCSVOptions;
}

const CSV_EXPORT_MODES: readonly CSVExportModeFragment[] = [
  {id: "csv", extension: ".csv"},
  {id: "excel_csv", extension: ".excel.csv", writeCSVOptions: {excelMode: true}},
];

export interface CSVExportMode extends CSVExportModeFragment {
  readonly label: string;
  readonly pickerTypes: SaveFilePickerOptions["types"];
}

type PersistentState = {
  readonly csvMode: string;
};

export function useCSVExportModeSelector({persistenceKey}: {persistenceKey?: string} = {}) {
  const t = useLangFunc();
  const modes = new Map<string, CSVExportMode>();
  for (const mode of CSV_EXPORT_MODES) {
    const label = t(`csv_export.format.${mode.id}`);
    modes.set(mode.id, {
      ...mode,
      label,
      pickerTypes: [{description: label, accept: {"text/csv": [mode.extension]}}],
    });
  }
  const [csvModeId, csvModeIdSetter] = createSignal<string>();
  const [csvMode, setCSVMode] = createSignal<CSVExportMode>();
  function setCSVModeId(modeId: string) {
    csvModeIdSetter(modeId);
    setCSVMode(modes.get(modeId));
  }
  if (persistenceKey) {
    createPersistence<PersistentState>({
      storage: localStorageStorage(persistenceKey),
      value: () => ({csvMode: csvModeId() || ""}),
      onLoad: (value) => setCSVModeId(value.csvMode),
      version: [2],
    });
  }
  createComputed(() => {
    const modeId = csvModeId();
    if (!modeId || !modes.has(modeId)) {
      setCSVModeId(modes.keys().next().value!);
    }
  });
  const CSVExportModeSelector: VoidComponent = () => {
    return (
      <SegmentedControl
        name="csv_export_mode"
        label=""
        value={csvModeId()}
        onValueChange={setCSVModeId}
        items={[...modes.values()].map(({id, label}) => ({value: id, label: () => label}))}
        small
      />
    );
  };
  return {
    CSVExportModeSelector,
    csvMode,
  };
}
