import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {InitialDataParams} from "features/meeting/MeetingCreateForm";
import {VoidComponent, createSignal, lazy} from "solid-js";

const MeetingCreateForm = lazy(() => import("features/meeting/MeetingCreateForm"));

interface FormParams {
  readonly initialData?: InitialDataParams;
}

const [modalParams, setModalParams] = createSignal<FormParams>();

export const MeetingCreateModal: VoidComponent = () => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.meeting_create.formName")}
      open={modalParams()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => setModalParams(undefined)}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <MeetingCreateForm
          initialData={params().initialData}
          onSuccess={() => setModalParams(undefined)}
          onCancel={() => setModalParams(undefined)}
        />
      )}
    </Modal>
  );
};

export function showMeetingCreateModal(params: FormParams = {}) {
  setModalParams(params);
}
