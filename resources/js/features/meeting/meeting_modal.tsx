import {capitalizeString} from "components/ui/Capitalize";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {Api} from "data-access/memo-api/types";
import {createComputed, createSignal} from "solid-js";
import {MeetingChangeSuccessData} from "./meeting_change_success_data";

const MeetingViewEditForm = lazyAutoPreload(() => import("features/meeting/MeetingViewEditForm"));

interface FormParams {
  readonly meetingId: Api.Id;
  /** Whether to show the meeting initially in view mode (and not in edit mode). Default: true. */
  readonly initialViewMode?: boolean;
  onDeleted?: (meetingId: string) => void;
  onEdited?: (meeting: MeetingChangeSuccessData) => void;
  onCopyCreated?: (meeting: MeetingChangeSuccessData) => void;
  /** Whether to show toast on success. Default: true. */
  readonly showToast?: boolean;
}

export const createMeetingModal = registerGlobalPageElement<FormParams>((args) => {
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
        createComputed(() => setViewMode(!!params().initialViewMode));
        return (
          <MeetingViewEditForm
            id={params().meetingId}
            viewMode={viewMode()}
            onViewModeChange={setViewMode}
            onEdited={(meeting) => {
              params().onEdited?.(meeting);
              args.clearParams();
            }}
            onCopyCreated={(meeting) => {
              params().onCopyCreated?.(meeting);
              args.clearParams();
            }}
            onDeleted={() => {
              params().onDeleted?.(params().meetingId);
              args.clearParams();
            }}
            onCancel={args.clearParams}
            showToast={params().showToast}
          />
        );
      }}
    </Modal>
  );
});
