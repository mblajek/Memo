import {createMutation} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {capitalizeString} from "components/ui/Capitalize";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {Api} from "data-access/memo-api/types";
import {AiOutlineDelete} from "solid-icons/ai";
import {FiEdit2} from "solid-icons/fi";
import {Match, Switch, VoidComponent, createSignal, lazy} from "solid-js";
import toast from "solid-toast";

const MeetingView = lazy(() => import("features/meeting/MeetingView"));
const MeetingEditForm = lazy(() => import("features/meeting/MeetingEditForm"));

interface FormParams {
  readonly meetingId: Api.Id;
  /** Whether to show the meeting initially in edit mode (and not in details mode). Default: false. */
  readonly initialEditMode?: boolean;
}

const [modalParams, setModalParams] = createSignal<FormParams>();

/** Modal for viewing and editing a meeting. */
export const MeetingModal: VoidComponent = () => {
  const t = useLangFunc();
  const [editMode, setEditMode] = createSignal(false);
  const invalidate = FacilityMeeting.useInvalidator();
  const deleteMeetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.deleteMeeting,
  }));
  return (
    <Modal
      title={editMode() ? t("forms.meeting_edit.formName") : capitalizeString(t("models.meeting._name"))}
      open={modalParams()}
      closeOn={editMode() ? ["escapeKey", "closeButton"] : ["escapeKey", "closeButton", "clickOutside"]}
      onClose={() => setModalParams(undefined)}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => {
        setEditMode(params().initialEditMode ?? false);
        async function deleteMeeting() {
          await deleteMeetingMutation.mutateAsync(params().meetingId);
          toast.success(t("forms.meeting_delete.success"));
          setModalParams(undefined);
          // Important: Invalidation should happen after calling onSuccess which typically closes the form.
          // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
          // but also causes problems apparently.
          invalidate.meetings();
        }
        return (
          <Switch>
            <Match when={editMode()}>
              <MeetingEditForm
                id={params().meetingId}
                onSuccess={() => setModalParams(undefined)}
                onCancel={() => setModalParams(undefined)}
              />
            </Match>
            <Match when={!editMode()}>
              <MeetingView id={params().meetingId} />
              <div class="flex gap-1 justify-end">
                <Button class="secondarySmall" onClick={() => deleteMeeting()}>
                  <AiOutlineDelete class="inlineIcon text-current" /> {t("actions.delete")}
                </Button>
                <Button class="secondarySmall" onClick={[setEditMode, true]}>
                  <FiEdit2 class="inlineIcon strokeIcon text-current" /> {t("actions.edit")}
                </Button>
              </div>
            </Match>
          </Switch>
        );
      }}
    </Modal>
  );
};

export function showMeetingModal(params: FormParams) {
  setModalParams(params);
}
