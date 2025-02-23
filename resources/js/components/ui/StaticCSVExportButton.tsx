import {Button, ButtonProps} from "components/ui/Button";
import {useCSVExportModeSelector} from "components/ui/CSVExportModeSelector";
import {CSVExportSupportWarning} from "components/ui/CSVExportSupportWarning";
import {Modal, MODAL_STYLE_PRESETS} from "components/ui/Modal";
import {BigSpinner} from "components/ui/Spinner";
import {SplitButton} from "components/ui/SplitButton";
import {useDocsModalInfoIcon} from "components/ui/docs_modal";
import {actionIcons} from "components/ui/icons";
import {NBSP} from "components/ui/symbols";
import {asyncThen, OrPromise, PossiblyAsyncIterable} from "components/utils/async";
import {cx} from "components/utils/classnames";
import {writeCSV} from "components/utils/csv_writer";
import {pickSaveFile} from "components/utils/files";
import {useLangFunc} from "components/utils/lang";
import {toastError, toastSuccess} from "components/utils/toast";
import {DateTime} from "luxon";
import {createEffect, createSignal, Index, JSX, Show, splitProps, VoidComponent} from "solid-js";

interface Props extends ButtonProps {
  readonly divClass?: string;
  readonly label?: JSX.Element;
  readonly baseFileName: string;
  readonly filePickerOptions?: SaveFilePickerOptions;
  readonly data: () => OrPromise<PossiblyAsyncIterable<readonly (string | undefined)[]>>;
  readonly staticPersistenceKey?: string;
}

export const StaticCSVExportButton: VoidComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, [
    "divClass",
    "label",
    "baseFileName",
    "filePickerOptions",
    "data",
    "staticPersistenceKey",
  ]);
  const t = useLangFunc();
  const {DocsModalInfoIcon} = useDocsModalInfoIcon();
  const {CSVExportModeSelector, csvMode} = useCSVExportModeSelector({
    persistenceKey: props.staticPersistenceKey || "CSVExport",
  });

  async function exportData() {
    const mode = csvMode();
    if (!mode) {
      throw new Error(`No mode selected`);
    }
    const options: SaveFilePickerOptions = {
      suggestedName: `${props.baseFileName}__${DateTime.now().toFormat("yyyy-MM-dd_HHmm")}${mode.extension}`,
      types: mode.pickerTypes,
      id: `csv_export_${mode.id}`,
      ...props.filePickerOptions,
    };
    const dataPromise = props.data();
    try {
      const writer = await pickSaveFile(options);
      if (writer === "cancelled") {
        return;
      }
      await writeCSV({writer, data: await dataPromise, ...mode.writeCSVOptions});
      toastSuccess(t("csv_export.success"));
    } catch (e) {
      console.error("CSV export error:", e);
      toastError(t("csv_export.error"));
    }
    setPreviewOpen(false);
  }

  const [previewOpen, setPreviewOpen] = createSignal(false);
  const [preview, setPreview] = createSignal<readonly (readonly (string | undefined)[])[]>();
  createEffect(() => {
    if (previewOpen()) {
      function handleError(e: Error) {
        console.error("CSV export error:", e);
        toastError(t("csv_export.error"));
        setPreviewOpen(false);
      }
      try {
        asyncThen(props.data(), async (data) => {
          const rows: (readonly (string | undefined)[])[] = [];
          for await (const row of data) {
            rows.push(row);
          }
          setPreview(rows);
        }).then(undefined, handleError);
      } catch (e) {
        if (e instanceof Error) {
          handleError(e);
        } else {
          throw e;
        }
      }
    } else {
      setPreview(undefined);
    }
  });
  return (
    <>
      <SplitButton
        {...buttonProps}
        divClass={props.divClass}
        onClick={exportData}
        popOver={(popOver) => (
          <div class="p-1 flex flex-col gap-1">
            <CSVExportSupportWarning />
            <div class="flex items-center">
              <CSVExportModeSelector />
              <div class="px-1">
                <DocsModalInfoIcon href="/help/csv-export.part" onClick={popOver.close} />
              </div>
            </div>
            <Button
              class="w-full secondary small"
              onClick={() => {
                popOver.close();
                setPreviewOpen(true);
              }}
            >
              {t("csv_export.show_preview")}
            </Button>
          </div>
        )}
      >
        {props.label || (
          <>
            <actionIcons.ExportCSV class="inlineIcon" /> {t("csv_export.label")}
          </>
        )}
      </SplitButton>
      <Modal
        title={t("csv_export.preview")}
        open={previewOpen()}
        style={MODAL_STYLE_PRESETS.wide}
        closeOn={["escapeKey", "closeButton", "clickOutside"]}
        onClose={() => setPreviewOpen(false)}
      >
        <Show when={preview()} fallback={<BigSpinner />}>
          <div class="flex flex-col gap-1">
            <div class="max-h-[70dvh] overflow-auto">
              <div class="text-sm whitespace-pre-line grid grid-flow-col border-b border-e border-gray-300 min-h-0 min-w-fit">
                <Index each={preview()}>
                  {(row) => (
                    <Index each={row()}>
                      {(cell, col) => (
                        <div class={cx("px-1 border-t border-s border-gray-300", col ? undefined : "col-start-1")}>
                          {cell() || NBSP}
                        </div>
                      )}
                    </Index>
                  )}
                </Index>
              </div>
            </div>
            <div class="self-center flex gap-1">
              <Button class="min-w-60 secondary" onClick={[setPreviewOpen, false]}>
                {t("actions.close")}
              </Button>
              <Button class="min-w-60 primary" onClick={exportData}>
                <actionIcons.ExportCSV class="inlineIcon" /> {t("csv_export.label")}
              </Button>
            </div>
          </div>
        </Show>
      </Modal>
    </>
  );
};
