import {Button} from "components/ui/Button";
import {facilityIcons} from "components/ui/icons";
import {Modal, MODAL_STYLE_PRESETS} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {doAndClearParams} from "components/utils/modals";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {WorkTimeCreateFormProps} from "features/meeting/WorkTimeCreateForm";
import {createComputed, createMemo, createSignal, Match, on, Show, Switch} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {SUBTYPE_FACILITY_WIDE, WorkTimeFormSubtype} from "./work_time_form_subtype";

const WorkTimeCreateForm = lazyAutoPreload(() => import("features/meeting/WorkTimeCreateForm"));

interface Params extends Omit<WorkTimeCreateFormProps, "formId" | "subtype"> {
  readonly subtype?: Partial<WorkTimeFormSubtype>;
  readonly availableStaff?: string;
}

export const createWorkTimeCreateModal = registerGlobalPageElement<Params>((args) => {
  const t = useLangFunc();
  const {meetingTypeDict} = useFixedDictionaries();
  const [subtype, setSubtype] = createSignal<Partial<WorkTimeFormSubtype>>();
  createComputed(
    on(
      () => args.params(),
      (params) => setSubtype(params?.subtype),
    ),
  );
  function getLeaveTimeFormId(staff: WorkTimeFormSubtype["staff"] | undefined) {
    return staff === SUBTYPE_FACILITY_WIDE ? "facility_wide_leave_time_create" : "leave_time_create";
  }
  const formId = () =>
    subtype()?.typeDictId === meetingTypeDict()?.work_time.id
      ? "work_time_create"
      : subtype()?.typeDictId === meetingTypeDict()?.leave_time.id
        ? getLeaveTimeFormId(subtype()?.staff)
        : "";
  const completedSubtype = createMemo(() => {
    const sub = subtype();
    if (!sub) {
      return undefined;
    }
    const {typeDictId, staff} = sub;
    if (!typeDictId || !staff) {
      return undefined;
    }
    return {typeDictId, staff, formId: formId()} satisfies WorkTimeFormSubtype;
  });
  return (
    <Modal
      title={completedSubtype() ? t(`forms.${formId()}.form_name`) : undefined}
      open={args.params()}
      closeOn={completedSubtype() ? ["escapeKey", "closeButton"] : ["escapeKey", "closeButton", "clickOutside"]}
      onClose={args.clearParams}
      style={completedSubtype() ? MODAL_STYLE_PRESETS.medium : MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => {
        const [facilityWide, setFacilityWide] = createSignal(!params().availableStaff);
        const staff = () => (facilityWide() ? SUBTYPE_FACILITY_WIDE : {id: params().availableStaff!});
        function openForm(typeDictId: string) {
          setSubtype({typeDictId, staff: staff()});
        }
        return (
          <Switch>
            <Match when={completedSubtype()}>
              {(subtype) => (
                <WorkTimeCreateForm
                  {...params()}
                  initialValues={params().initialValues}
                  subtype={subtype()}
                  onSuccess={doAndClearParams(args, params().onSuccess)}
                  onCancel={args.clearParams}
                />
              )}
            </Match>
            <Match when="incomplete subtype">
              <div class="flex flex-col items-stretch gap-2">
                <div class="flex flex-col gap-1">
                  <Show when={params().availableStaff}>
                    {(staff) => (
                      <label class="flex gap-1 items-center">
                        <input type="radio" checked={!facilityWide()} onClick={[setFacilityWide, false]} />{" "}
                        <UserLink type="staff" userId={staff()} link={false} />
                      </label>
                    )}
                  </Show>
                  <label class="flex gap-1 items-center">
                    <input type="radio" checked={facilityWide()} onClick={[setFacilityWide, true]} />
                    <div class="flex gap-0.5">
                      <facilityIcons.Facility size="20" />
                      {t("meetings.facility_wide")}
                    </div>
                  </label>
                </div>
                <div class="grid auto-cols-fr grid-flow-col gap-1 min-h-16" style={{"line-height": "1.1"}}>
                  <Button class="secondary" onClick={[openForm, meetingTypeDict()!.work_time.id]}>
                    {t("forms.work_time_create.form_name")}
                  </Button>
                  <Button class="secondary" onClick={[openForm, meetingTypeDict()!.leave_time.id]}>
                    {t(`forms.${getLeaveTimeFormId(staff())}.form_name`)}
                  </Button>
                </div>
              </div>
            </Match>
          </Switch>
        );
      }}
    </Modal>
  );
});
