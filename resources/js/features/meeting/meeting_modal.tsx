import {capitalizeString} from "components/ui/Capitalize";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {MeetingViewEditFormProps} from "features/meeting/MeetingViewEditForm";
import {createComputed, createSignal} from "solid-js";

const MeetingViewEditForm = lazyAutoPreload(() => import("features/meeting/MeetingViewEditForm"));

type Params = Omit<MeetingViewEditFormProps, "viewMode"> & {readonly initialViewMode?: boolean};

export const createMeetingModal = registerGlobalPageElement<Params>((args) => {
  const t = useLangFunc();
  const [viewMode, setViewMode] = createSignal(true);
  return (
    <Modal
      title={viewMode() ? capitalizeString(t("models.meeting._name")) : t("forms.meeting_edit.formName")}
      open={args.params()}
      closeOn={viewMode() ? ["escapeKey", "closeButton", "clickOutside"] : ["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => {
        // Reinitialise the view mode on a new invocation of the modal.
        createComputed(() => setViewMode(!!params().initialViewMode));
        return (
          <MeetingViewEditForm
            {...params()}
            viewMode={viewMode()}
            onViewModeChange={(viewMode) => {
              params().onViewModeChange?.(viewMode);
              setViewMode(viewMode);
            }}
            onEdited={(meeting) => {
              params().onEdited?.(meeting);
              args.clearParams();
            }}
            onCreated={(meeting) => {
              params().onCreated?.(meeting);
              args.clearParams();
            }}
            onDeleted={() => {
              params().onDeleted?.(params().meetingId);
              args.clearParams();
            }}
            onCancel={() => {
              params().onCancel?.();
              args.clearParams();
            }}
          />
        );
      }}
    </Modal>
  );
});
