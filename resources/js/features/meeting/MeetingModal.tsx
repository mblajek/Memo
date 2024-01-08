import {capitalizeString} from "components/ui/Capitalize";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {Api} from "data-access/memo-api/types";
import {VoidComponent, createComputed, createSignal, lazy} from "solid-js";

const MeetingViewEditForm = lazy(() => import("features/meeting/MeetingViewEditForm"));

interface FormParams {
  readonly meetingId: Api.Id;
  /** Whether to show the meeting initially in view mode (and not in edit mode). Default: true. */
  readonly initialViewMode?: boolean;
}

const [modalParams, setModalParams] = createSignal<FormParams>();

/** Modal for viewing and editing a meeting. */
export const MeetingModal: VoidComponent = () => {
  const t = useLangFunc();
  const [viewMode, setViewMode] = createSignal(true);
  return (
    <Modal
      title={viewMode() ? capitalizeString(t("models.meeting._name")) : t("forms.meeting_edit.formName")}
      open={modalParams()}
      closeOn={viewMode() ? ["escapeKey", "closeButton", "clickOutside"] : ["escapeKey", "closeButton"]}
      onClose={() => setModalParams(undefined)}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => {
        createComputed(() => setViewMode(!!params().initialViewMode));
        return (
          <MeetingViewEditForm
            id={params().meetingId}
            viewMode={viewMode()}
            onViewModeChange={setViewMode}
            onEdited={() => setModalParams(undefined)}
            onDeleted={() => setModalParams(undefined)}
            onCancel={() => setModalParams(undefined)}
          />
        );
      }}
    </Modal>
  );
};

export function showMeetingModal(params: FormParams) {
  setModalParams(params);
}
