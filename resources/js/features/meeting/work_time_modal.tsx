import {capitalizeString} from "components/ui/Capitalize";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {doAndClearParams} from "components/utils/modals";
import {WorkTimeViewEditFormProps} from "features/meeting/WorkTimeViewEditForm";
import {createComputed, createSignal} from "solid-js";

const WorkTimeViewEditForm = lazyAutoPreload(() => import("features/meeting/WorkTimeViewEditForm"));

export type WorkTimeModalParams = Omit<WorkTimeViewEditFormProps, "viewMode"> & {readonly initialViewMode: boolean};

export const createWorkTimeModal = registerGlobalPageElement<WorkTimeModalParams>((args) => {
  const t = useLangFunc();
  const [viewMode, setViewMode] = createSignal(true);
  return (
    <Modal
      title={viewMode() ? capitalizeString(t("meetings.work_time_or_leave_time")) : t("forms.work_time_edit.form_name")}
      open={args.params()}
      closeOn={viewMode() ? ["escapeKey", "closeButton", "clickOutside"] : ["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => {
        // Reinitialise the view mode on a new invocation of the modal.
        createComputed(() => setViewMode(!!params().initialViewMode));
        return (
          <WorkTimeViewEditForm
            {...params()}
            viewMode={viewMode()}
            onViewModeChange={(viewMode) => {
              params().onViewModeChange?.(viewMode);
              setViewMode(viewMode);
            }}
            onEdited={doAndClearParams(args, params().onEdited)}
            onCreated={doAndClearParams(args, params().onCreated)}
            onCloned={doAndClearParams(args, params().onCloned)}
            onDeleted={(count, deletedThisWorkTime) => {
              try {
                params().onDeleted?.(count, deletedThisWorkTime);
              } finally {
                if (deletedThisWorkTime) {
                  args.clearParams();
                }
              }
            }}
            onCancel={doAndClearParams(args, params().onCancel)}
          />
        );
      }}
    </Modal>
  );
});
