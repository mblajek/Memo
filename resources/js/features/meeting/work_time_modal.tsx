import {Capitalize} from "components/ui/Capitalize";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils/lang";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {doAndClearParams} from "components/utils/modals";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {SUBTYPE_FACILITY_WIDE, WorkTimeFormSubtype} from "features/meeting/work_time_form_subtype";
import {WorkTimeViewEditFormProps} from "features/meeting/WorkTimeViewEditForm";
import {createComputed, createMemo, createSignal} from "solid-js";

const WorkTimeViewEditForm = lazyAutoPreload(() => import("features/meeting/WorkTimeViewEditForm"));

export interface WorkTimeModalParams
  extends Omit<WorkTimeViewEditFormProps, "staticMeetingId" | "viewMode" | "subtype"> {
  readonly meeting: Pick<MeetingResource, "id" | "typeDictId" | "staff">;
  readonly initialViewMode: boolean;
}

export const createWorkTimeModal = registerGlobalPageElement<WorkTimeModalParams>((args) => {
  const t = useLangFunc();
  const {meetingTypeDict} = useFixedDictionaries();
  const typeAndStaff = createMemo(() => {
    const params = args.params();
    return params
      ? ({
          typeDictId: params.meeting.typeDictId,
          staff: params.meeting.staff.length ? {id: params.meeting.staff[0]!.userId} : SUBTYPE_FACILITY_WIDE,
        } satisfies Partial<WorkTimeFormSubtype>)
      : undefined;
  });
  const formId = () =>
    typeAndStaff()?.typeDictId === meetingTypeDict()?.work_time.id
      ? "work_time_edit"
      : typeAndStaff()?.typeDictId === meetingTypeDict()?.leave_time.id
        ? typeAndStaff()?.staff === SUBTYPE_FACILITY_WIDE
          ? "facility_wide_leave_time_edit"
          : "leave_time_edit"
        : "";

  const [viewMode, setViewMode] = createSignal(true);
  return (
    <Modal
      title={
        viewMode() ? (
          <Capitalize text={t(`forms.${formId()}.field_names.entity_name`)} />
        ) : (
          t(`forms.${formId()}.form_name`)
        )
      }
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
            staticMeetingId={params().meeting.id}
            subtype={{
              ...typeAndStaff()!,
              formId: formId(),
            }}
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
