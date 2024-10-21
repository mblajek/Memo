import {createQuery, keepPreviousData} from "@tanstack/solid-query";
import {FormType} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {HideableSection} from "components/ui/HideableSection";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {RichTextViewEdit} from "components/ui/form/RichTextViewEdit";
import {calendarIcons} from "components/ui/icons";
import {getCalendarViewLinkData} from "components/ui/meetings-calendar/calendar_link";
import {EMPTY_VALUE_SYMBOL_STRING} from "components/ui/symbols";
import {title} from "components/ui/title";
import {delayedAccessor, useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {MeetingResourceForCreate, MeetingResourceForPatch} from "data-access/memo-api/resources/meeting.resource";
import {dateToISO} from "data-access/memo-api/utils";
import {DateTime} from "luxon";
import {JSX, Show, VoidComponent, createMemo} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {z} from "zod";
import {AbstractMeetingForm, AbstractMeetingFormProps} from "./AbstractMeetingForm";
import {MeetingAttendantsFields, getAttendantsSchemaPart} from "./MeetingAttendantsFields";
import {MeetingAttendantsNotifications} from "./MeetingAttendantsNotifications";
import {MeetingCannedStatusEdits} from "./MeetingCannedStatusEdits";
import {MeetingDateAndTime} from "./MeetingDateAndTime";
import {MeetingSeriesControls, getMeetingSeriesSchema} from "./MeetingSeriesForm";
import {MeetingTypeFields} from "./MeetingTypeFields";
import {MeetingStatusInfoIcon} from "./attendance_status_info";
import {getMeetingTimeDurationData, getMeetingTimeFieldsSchemaPart} from "./meeting_time_controller";

type _Directives = typeof title;

const getSchema = () =>
  z
    .object({
      date: z.string(),
      typeDictId: z.string(),
      statusDictId: z.string(),
      isRemote: z.boolean(),
      notes: z.string(),
      resources: z.array(z.string()),
      createSeries: z.boolean().optional(),
      fromMeetingId: z.string().optional(),
    })
    .merge(getMeetingTimeFieldsSchemaPart())
    .merge(getAttendantsSchemaPart())
    .merge(getMeetingSeriesSchema().partial());

export type MeetingFormType = z.infer<ReturnType<typeof getSchema>>;

export const MeetingForm: VoidComponent<AbstractMeetingFormProps<MeetingFormType>> = (props) => {
  const t = useLangFunc();
  const {meetingStatusDict, meetingResourcesDict} = useFixedDictionaries();
  const meetingResourcesExist = createMemo(() => !!meetingResourcesDict()?.getDictionary().allPositions.length);
  const activeFacility = useActiveFacility();

  const ByMode: VoidComponent<{view?: JSX.Element; edit?: JSX.Element}> = (byModeProps) => (
    <Show when={props.viewMode} fallback={byModeProps.edit}>
      {byModeProps.view}
    </Show>
  );

  const FormContents: VoidComponent<{form: FormType<MeetingFormType>}> = (props2) => {
    // eslint-disable-next-line solid/reactivity
    const form = props2.form;
    const dateAndTime = createMemo(() => ({date: form.data("date"), time: form.data("time")}), undefined, {
      equals: (a, b) =>
        a.date === b.date &&
        a.time.allDay === b.time.allDay &&
        a.time.startTime === b.time.startTime &&
        a.time.endTime === b.time.endTime,
    });
    // eslint-disable-next-line solid/reactivity
    const delayedDateAndTime = delayedAccessor(dateAndTime);
    const conflictsDataQuery = createQuery(() => {
      const {startDayMinute, durationMinutes} = getMeetingTimeDurationData(delayedDateAndTime().time);
      return {
        ...FacilityMeeting.conflictsQueryOptions({
          samples: [
            {
              date: delayedDateAndTime().date ? dateToISO(DateTime.fromISO(delayedDateAndTime().date)) : "",
              startDayminute: startDayMinute ?? -1,
              durationMinutes: durationMinutes || 5,
            },
          ],
          resources: true,
          ignoreMeetingIds: props.meeting ? [props.meeting.id] : undefined,
        }),
        placeholderData: keepPreviousData,
        enabled: !!(
          !props.viewMode &&
          meetingResourcesExist() &&
          delayedDateAndTime().date &&
          startDayMinute !== undefined
        ),
      };
    });
    const occupiedResourceIds = createMemo((): ReadonlySet<string> | undefined => {
      if (!meetingResourcesExist()) {
        return undefined;
      }
      if (!props.viewMode && conflictsDataQuery.data) {
        return new Set(conflictsDataQuery.data[0]?.resources?.map(({id}) => id));
      }
      if (props.viewMode || conflictsDataQuery.isPending) {
        return new Set(props.meeting?.["resourceConflicts.*.resourceDictId"]);
      }
      return undefined;
    });
    const conflictingResourceIds = createMemo(() =>
      form.data("resources").filter((id) => occupiedResourceIds()?.has(id)),
    );
    return (
      <>
        <div class="flex flex-col gap-1">
          <MeetingDateAndTime
            // Does not work very well on Chrome currently.
            // suggestedTimes={{range: [8 * 60, 18 * 60], step: 30}}
            viewMode={props.viewMode}
            forceEditable={props.forceTimeEditable}
            meeting={props.meeting}
          />
          <Show when={props.allowCreateSeries}>
            <CheckboxField name="createSeries" />
            <Show when={form.data("date")}>
              {(formData) => (
                <fieldset data-felte-keep-on-remove disabled={!form.data("createSeries")}>
                  <HideableSection show={form.data("createSeries")}>
                    <div class="pl-2 border-l-4 border-gray-400">
                      <MeetingSeriesControls startDate={DateTime.fromISO(formData())} compact />
                    </div>
                  </HideableSection>
                </fieldset>
              )}
            </Show>
          </Show>
        </div>
        <div class="flex gap-1">
          <div class="basis-0 grow">
            <MeetingTypeFields />
          </div>
          <div class="basis-0 grow">
            <div class="flex flex-col items-stretch gap-1">
              <DictionarySelect
                name="statusDictId"
                label={(origLabel) => (
                  <>
                    {origLabel} <MeetingStatusInfoIcon meetingStatusId={form.data("statusDictId")} />
                  </>
                )}
                dictionary="meetingStatus"
                nullable={false}
              />
              <Show
                when={
                  props.viewMode &&
                  props.initialValues?.statusDictId &&
                  props.initialValues.statusDictId === meetingStatusDict()?.planned.id &&
                  props.onViewModeChange
                }
              >
                <MeetingCannedStatusEdits onViewModeChange={props.onViewModeChange!} />
              </Show>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <MeetingAttendantsFields name="staff" meetingId={props.meeting?.id} viewMode={props.viewMode} />
          <MeetingAttendantsFields
            name="clients"
            meetingId={props.meeting?.id}
            showAttendanceStatusLabel={false}
            viewMode={props.viewMode}
          />
          <MeetingAttendantsNotifications viewMode={props.viewMode} />
        </div>
        <CheckboxField name="isRemote" />
        <RichTextViewEdit name="notes" viewMode={props.viewMode} staticPersistenceKey="meeting.notes" />
        <Show when={meetingResourcesDict()?.getDictionary().allPositions.length}>
          <div class="flex flex-col items-stretch">
            <DictionarySelect
              name="resources"
              dictionary="meetingResource"
              itemFunc={(pos, defItem) => ({
                ...defItem(),
                label: () => (
                  <span class={occupiedResourceIds()?.has(pos.id) ? "text-red-600" : undefined}>
                    {defItem().text}
                    <Show when={occupiedResourceIds()?.has(pos.id)}>
                      {" "}
                      <span use:title={t("meetings.resource_conflicts.conflicting_resource")}>
                        <calendarIcons.Conflict class="inlineIcon" />
                      </span>
                    </Show>
                  </span>
                ),
              })}
              multiple
              closeOnSelect
              placeholder={EMPTY_VALUE_SYMBOL_STRING}
            />
            <HideableSection show={conflictingResourceIds().length}>
              <LinkWithNewTabLink
                {...getCalendarViewLinkData(`/${activeFacility()?.url}/calendar`, {
                  mode: ["week", "day"],
                  resources: conflictingResourceIds(),
                  meeting: props.meeting,
                })}
                target={props.viewMode ? undefined : "_blank"}
                onClick={(e) => {
                  // Cancel the form, but not when the new tab link is clicked.
                  if (!e.currentTarget.target) {
                    props.onCancel?.();
                  }
                }}
              >
                {t("meetings.resource_conflicts.show_conflicts")}
              </LinkWithNewTabLink>
            </HideableSection>
          </div>
        </Show>
        <ByMode
          edit={
            <FelteSubmit
              cancel={() => {
                form.reset();
                props.onCancel?.();
              }}
            />
          }
        />
      </>
    );
  };

  return (
    <AbstractMeetingForm {...props} schema={getSchema()}>
      {(form) => <FormContents form={form} />}
    </AbstractMeetingForm>
  );
};

export function getResourceValuesForEdit(values: Partial<MeetingFormType>) {
  return {
    resources: values.resources?.map((resourceDictId) => ({resourceDictId})),
  } satisfies Partial<MeetingResourceForPatch>;
}

export function getResourceValuesForCreate(values: Partial<MeetingFormType>) {
  const {resources = []} = getResourceValuesForEdit(values);
  return {resources} satisfies Partial<MeetingResourceForCreate>;
}
