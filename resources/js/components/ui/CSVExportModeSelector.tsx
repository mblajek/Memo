import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {WriteCSVOptions} from "components/utils/csv_writer";
import {useLangFunc} from "components/utils/lang";
import {createComputed, onMount, VoidComponent} from "solid-js";

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
}

interface Props {
  readonly modeId: string | undefined;
  readonly onModeChange: (mode: CSVExportMode) => void;
}

export const CSVExportModeSelector: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const modes = new Map<string, CSVExportMode>();
  for (const mode of CSV_EXPORT_MODES) {
    modes.set(mode.id, {...mode, label: t(`tables.export.format.${mode.id}`)});
  }
  function setModeId(modeId: string | undefined) {
    if (modeId) {
      props.onModeChange(modes.get(modeId)!);
    }
  }
  onMount(() => setModeId(props.modeId));
  createComputed(() => {
    if (!props.modeId || !modes.has(props.modeId)) {
      setModeId(CSV_EXPORT_MODES[0]!.id);
    }
  });
  return (
    <SegmentedControl
      name="csv_export_mode"
      value={props.modeId}
      onValueChange={setModeId}
      items={[...modes.values()].map(({id, label}) => ({value: id, label: () => label}))}
      small
    />
  );
};
