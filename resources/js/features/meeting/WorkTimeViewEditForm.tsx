import {createQuery} from "@tanstack/solid-query";
import {Button, DeleteButton, EditButton} from "components/ui/Button";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {LoadingPane} from "components/ui/LoadingPane";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {BigSpinner} from "components/ui/Spinner";
import {SplitButton} from "components/ui/SplitButton";
import {createConfirmation} from "components/ui/confirmation";
import {ACTION_ICONS} from "components/ui/icons";
import {getMeetingLinkData} from "components/ui/meetings-calendar/meeting_link";
import {LangFunc, QueryBarrier, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {skipUndefinedValues} from "components/utils/object_util";
import {toastSuccess} from "components/utils/toast";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {MeetingResourceForPatch} from "data-access/memo-api/resources/meeting.resource";
import {Api, RequiredNonNullable} from "data-access/memo-api/types";
import {DateTime} from "luxon";
import {For, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {CreatedByInfo} from "../facility-users/CreatedByInfo";
import {WorkTimeForm, WorkTimeFormType} from "./WorkTimeForm";
import {getStaffValueForPatch, staffInitialValue} from "./WorkTimeStaffSelectField";
import {useMeetingAPI} from "./meeting_api";
import {MeetingBasicData} from "./meeting_basic_data";
import {createMeetingSeriesCreateModal} from "./meeting_series_create_modal";
import {getMeetingTimeFullData, meetingTimeInitialValueForEdit} from "./meeting_time_controller";
import {createWorkTimeCreateModal} from "./work_time_create_modal";

export interface WorkTimeViewEditFormProps {
  readonly meetingId: Api.Id;
  readonly viewMode: boolean;
  readonly showGoToMeetingButton?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onEdited?: (meeting: MeetingBasicData) => void;
  readonly onCreated?: (meeting: MeetingBasicData) => void;
  readonly onCloned?: (firstMeeting: MeetingBasicData, otherMeetingIds: string[]) => void;
  readonly onDeleted?: (meetingId: string) => void;
  readonly onCancel?: () => void;
}

export const WorkTimeViewEditForm: VoidComponent<WorkTimeViewEditFormProps> = (props) => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const attributes = useAttributes();
  const {dictionaries, meetingStatusDict} = useFixedDictionaries();
  const meetingAPI = useMeetingAPI();
  const invalidate = useInvalidator();
  const workTimeCreateModal = createWorkTimeCreateModal();
  const seriesCreateModal = createMeetingSeriesCreateModal();
  const confirmation = createConfirmation();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(props.meetingId));
  const workTime = () => meetingQuery.data!;
  const isBusy = () => !!meetingAPI.isPending();

  function transformFormValues(values: Partial<WorkTimeFormType>): Partial<MeetingResourceForPatch> {
    return {
      ...values,
      ...getMeetingTimeFullData(values).timeValues,
      ...getStaffValueForPatch(dictionaries()!, values),
    };
  }

  async function updateWorkTime(values: Partial<WorkTimeFormType>) {
    const origMeeting = workTime();
    const meetingPatch = transformFormValues(values);
    await meetingAPI.update(props.meetingId, meetingPatch);
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t("forms.work_time_edit.success"));
      props.onEdited?.({
        ...origMeeting,
        ...skipUndefinedValues(meetingPatch as RequiredNonNullable<MeetingResourceForPatch>),
      });
      // Important: Invalidation should happen after calling onEdited which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.facility.meetings();
    };
  }

  async function deleteWorkTime() {
    await meetingAPI.delete(props.meetingId);
    toastSuccess(t("forms.work_time_delete.success"));
    props.onDeleted?.(props.meetingId);
    // Important: Invalidation should happen after calling onDeleted which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.meetings();
  }

  const initialValues = () => {
    return {
      ...meetingTimeInitialValueForEdit(workTime()),
      typeDictId: workTime().typeDictId,
      ...staffInitialValue(workTime()),
      notes: workTime().notes || "",
    } satisfies WorkTimeFormType;
  };

  function createCopyInDays(days: number) {
    workTimeCreateModal.show({
      initialValues: {
        ...initialValues(),
        date: DateTime.fromISO(workTime().date).plus({days}).toISODate(),
        fromMeetingId: props.meetingId,
      },
      onSuccess: (meeting) => props.onCreated?.(meeting),
    });
  }

  return (
    <QueryBarrier queries={[meetingQuery]} ignoreCachedData {...notFoundError()}>
      <Show
        // Hide the form when another form is opened on top, to avoid duplicate element ids.
        when={!workTimeCreateModal.isShown()}
      >
        <Show when={attributes() && meetingStatusDict()} fallback={<BigSpinner />}>
          <div class="flex flex-col gap-3">
            <div class="relative flex flex-col">
              <div class="flex justify-between">
                <Show when={props.showGoToMeetingButton} fallback={<span />}>
                  <LinkWithNewTabLink
                    {...getMeetingLinkData(`/${activeFacility()?.url}/admin/time-tables`, workTime())}
                  >
                    {t("meetings.show_in_calendar")}
                  </LinkWithNewTabLink>
                </Show>
                <CreatedByInfo class="-mb-2" data={workTime()} />
              </div>
              <WorkTimeForm
                id="work_time_edit"
                initialValues={initialValues()}
                viewMode={props.viewMode}
                onViewModeChange={props.onViewModeChange}
                meeting={workTime()}
                onSubmit={updateWorkTime}
                onCancel={() => {
                  if (props.onViewModeChange) {
                    props.onViewModeChange(true);
                  } else {
                    props.onCancel?.();
                  }
                }}
              />
              <LoadingPane
                isLoading={
                  // If the edit mutation is pending, the form already shows the pane.
                  meetingAPI.isPending()?.delete
                }
              />
            </div>
            <Show when={props.viewMode}>
              <div class="flex gap-1 justify-between">
                <DeleteButton
                  class="secondary small"
                  confirm={() => confirmation.confirm(workTimeDeleteConfirmParams(t))}
                  delete={deleteWorkTime}
                  disabled={isBusy()}
                />
                <div class="flex gap-1">
                  <SplitButton
                    class="secondary small"
                    onClick={() => {
                      seriesCreateModal.show({
                        startMeeting: workTime(),
                        onSuccess: props.onCloned,
                      });
                    }}
                    popOver={(popOver) => (
                      <SimpleMenu onClick={() => popOver().close()}>
                        <Button onClick={[createCopyInDays, 0]}>{t("meetings.create_copy.any")}</Button>
                        <For
                          each={
                            [
                              ["in_one_day", 1],
                              ["in_one_week", 7],
                              ["in_two_weeks", 14],
                            ] as const
                          }
                        >
                          {([labelKey, days]) => (
                            <Button class="flex justify-between gap-2" onClick={[createCopyInDays, days]}>
                              <span>{t(`meetings.create_copy.${labelKey}`)}</span>
                              <span class="text-grey-text">
                                {t("parenthesised", {
                                  text: DateTime.fromISO(workTime().date)
                                    .plus({days})
                                    .toLocaleString({day: "numeric", month: "long"}),
                                })}
                              </span>
                            </Button>
                          )}
                        </For>
                      </SimpleMenu>
                    )}
                    disabled={isBusy()}
                  >
                    <ACTION_ICONS.repeat class="inlineIcon text-current" /> {t("meetings.create_series")}
                  </SplitButton>
                  <Show when={props.onViewModeChange}>
                    <EditButton
                      class="secondary small"
                      onClick={[props.onViewModeChange!, false]}
                      disabled={isBusy()}
                    />
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </Show>
    </QueryBarrier>
  );
};

// For lazy loading
export default WorkTimeViewEditForm;

export function workTimeDeleteConfirmParams(t: LangFunc) {
  return {
    title: t("forms.work_time_delete.form_name"),
    body: t("forms.work_time_delete.confirmation_text"),
    confirmText: t("forms.work_time_delete.submit"),
  };
}
