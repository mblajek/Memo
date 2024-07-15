import {createQuery} from "@tanstack/solid-query";
import {Button, DeleteButton, EditButton} from "components/ui/Button";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {LoadingPane} from "components/ui/LoadingPane";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {BigSpinner} from "components/ui/Spinner";
import {SplitButton} from "components/ui/SplitButton";
import {createConfirmation} from "components/ui/confirmation";
import {actionIcons} from "components/ui/icons";
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
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {Api, RequiredNonNullable} from "data-access/memo-api/types";
import {DateTime} from "luxon";
import {For, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {CreatedByInfo} from "../facility-users/CreatedByInfo";
import {getAttendantsValuesForEdit, useAttendantsCreator} from "./MeetingAttendantsFields";
import {MeetingForm, MeetingFormType, getResourceValuesForEdit} from "./MeetingForm";
import {useMeetingAPI} from "./meeting_api";
import {MeetingBasicData} from "./meeting_basic_data";
import {createMeetingCreateModal} from "./meeting_create_modal";
import {createMeetingSeriesCreateModal} from "./meeting_series_create_modal";
import {getMeetingTimeFullData, meetingTimeInitialValueForEdit} from "./meeting_time_controller";

export interface MeetingViewEditFormProps {
  readonly staticMeetingId: Api.Id;
  readonly viewMode: boolean;
  readonly showGoToMeetingButton?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onEdited?: (meeting: MeetingBasicData) => void;
  readonly onCreated?: (meeting: MeetingBasicData) => void;
  readonly onCloned?: (firstMeeting: MeetingBasicData, otherMeetingIds: string[]) => void;
  readonly onDeleted?: () => void;
  readonly onCancel?: () => void;
  /** Whether to show toast on success. Default: true. */
  readonly showToast?: boolean;
}

export const MeetingViewEditForm: VoidComponent<MeetingViewEditFormProps> = (props) => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const attributes = useAttributes();
  const {meetingStatusDict} = useFixedDictionaries();
  const {attendantsInitialValueForEdit, attendantsInitialValueForCreateCopy} = useAttendantsCreator();
  const meetingAPI = useMeetingAPI();
  const invalidate = useInvalidator();
  const meetingCreateModal = createMeetingCreateModal();
  const seriesCreateModal = createMeetingSeriesCreateModal();
  const confirmation = createConfirmation();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(props.staticMeetingId));
  const {dataQuery: meetingTQuery} = createTQuery({
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    entityURL: `facility/${activeFacility()?.id}/meeting`,
    requestCreator: staticRequestCreator({
      columns: [
        {type: "column", column: "seriesNumber"},
        {type: "column", column: "seriesCount"},
      ],
      filter: {type: "column", column: "id", op: "=", val: props.staticMeetingId},
      sort: [],
      paging: {size: 1},
    }),
    dataQueryOptions: () => ({enabled: !!meetingQuery.data?.fromMeetingId}),
  });
  const meeting = () => ({...meetingQuery.data!, ...meetingTQuery.data?.data[0]});
  const isBusy = () => !!meetingAPI.isPending();

  async function updateMeeting(values: Partial<MeetingFormType>) {
    const origMeeting = meeting();
    const meetingPatch = transformFormValues(values);
    if (origMeeting.staff.length && meetingPatch.staff?.length === 0) {
      if (
        !(await confirmation.confirm({
          title: t("meetings.meeting_without_staff.title"),
          body: t("meetings.meeting_without_staff.body"),
          confirmText: t("forms.meeting_create.submit"),
        }))
      ) {
        return;
      }
    }
    await meetingAPI.update(props.staticMeetingId, meetingPatch);
    // eslint-disable-next-line solid/reactivity
    return () => {
      if (props.showToast ?? true) {
        toastSuccess(t("forms.meeting_edit.success"));
      }
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

  async function deleteMeeting() {
    await meetingAPI.delete(props.staticMeetingId);
    if (props.showToast ?? true) {
      toastSuccess(t("forms.meeting_delete.success"));
    }
    props.onDeleted?.();
    // Important: Invalidation should happen after calling onDeleted which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.meetings();
  }

  const initialValues = () => {
    return {
      ...meetingTimeInitialValueForEdit(meeting()),
      typeDictId: meeting().typeDictId,
      statusDictId: meeting().statusDictId,
      ...attendantsInitialValueForEdit(meeting()),
      isRemote: meeting().isRemote,
      notes: meeting().notes || "",
      resources: meeting().resources.map(({resourceDictId}) => resourceDictId),
    } satisfies MeetingFormType;
  };

  function createCopyInDays(days: number) {
    meetingCreateModal.show({
      initialValues: {
        ...initialValues(),
        date: DateTime.fromISO(meeting().date).plus({days}).toISODate(),
        statusDictId: meetingStatusDict()!.planned.id,
        ...attendantsInitialValueForCreateCopy(meeting()),
        fromMeetingId: props.staticMeetingId,
      },
      onSuccess: (meeting) => props.onCreated?.(meeting),
      forceTimeEditable: !days,
      showToast: props.showToast,
    });
  }

  return (
    <QueryBarrier queries={[meetingQuery]} ignoreCachedData {...notFoundError()}>
      <Show
        // Hide the form when another form is opened on top, to avoid duplicate element ids.
        when={!meetingCreateModal.isShown()}
      >
        <Show when={attributes() && meetingStatusDict()} fallback={<BigSpinner />}>
          <div class="flex flex-col gap-3">
            <div class="relative flex flex-col">
              <div class="flex justify-between">
                <Show when={props.showGoToMeetingButton} fallback={<span />}>
                  <LinkWithNewTabLink {...getMeetingLinkData(`/${activeFacility()?.url}/calendar`, meeting())}>
                    {t("meetings.show_in_calendar")}
                  </LinkWithNewTabLink>
                </Show>
                <CreatedByInfo class="-mb-2" data={meeting()} />
              </div>
              <MeetingForm
                id="meeting_edit"
                initialValues={initialValues()}
                viewMode={props.viewMode}
                onViewModeChange={props.onViewModeChange}
                meeting={meeting()}
                onSubmit={updateMeeting}
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
                  confirm={() => confirmation.confirm(meetingDeleteConfirmParams(t))}
                  delete={deleteMeeting}
                  disabled={isBusy()}
                />
                <div class="flex gap-1">
                  <SplitButton
                    class="secondary small"
                    onClick={() => {
                      seriesCreateModal.show({
                        startMeeting: meeting(),
                        onSuccess: props.onCloned,
                        showToast: props.showToast,
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
                                  text: DateTime.fromISO(meeting().date)
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
                    <actionIcons.Repeat class="inlineIcon" /> {t("meetings.create_series")}
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
export default MeetingViewEditForm;

export function transformFormValues(values: Partial<MeetingFormType>): Partial<MeetingResourceForPatch> {
  return {
    ...values,
    ...getMeetingTimeFullData(values).timeValues,
    ...getAttendantsValuesForEdit(values),
    ...getResourceValuesForEdit(values),
  };
}

export function meetingDeleteConfirmParams(t: LangFunc) {
  return {
    title: t("forms.meeting_delete.form_name"),
    body: t("forms.meeting_delete.confirmation_text"),
    confirmText: t("forms.meeting_delete.submit"),
  };
}
