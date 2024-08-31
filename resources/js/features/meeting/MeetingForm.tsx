import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {HideableSection} from "components/ui/HideableSection";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {RichTextViewEdit} from "components/ui/form/RichTextViewEdit";
import {calendarIcons} from "components/ui/icons";
import {getCalendarViewLinkData} from "components/ui/meetings-calendar/calendar_link";
import {EMPTY_VALUE_SYMBOL_STRING} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {MeetingResourceForCreate, MeetingResourceForPatch} from "data-access/memo-api/resources/meeting.resource";
import {DateTime} from "luxon";
import {JSX, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {z} from "zod";
import {AbstractMeetingForm, AbstractMeetingFormProps} from "./AbstractMeetingForm";
import {MeetingAttendantsFields, getAttendantsSchemaPart} from "./MeetingAttendantsFields";
import {MeetingCannedStatusEdits} from "./MeetingCannedStatusEdits";
import {MeetingDateAndTime} from "./MeetingDateAndTime";
import {MeetingSeriesControls, getMeetingSeriesSchema} from "./MeetingSeriesForm";
import {MeetingTypeFields} from "./MeetingTypeFields";
import {MeetingStatusInfoIcon} from "./attendance_status_info";
import {getMeetingTimeFieldsSchemaPart} from "./meeting_time_controller";

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
  const {dictionaries, meetingStatusDict} = useFixedDictionaries();
  const activeFacility = useActiveFacility();

  const ByMode: VoidComponent<{view?: JSX.Element; edit?: JSX.Element}> = (byModeProps) => (
    <Show when={props.viewMode} fallback={byModeProps.edit}>
      {byModeProps.view}
    </Show>
  );

  return (
    <AbstractMeetingForm {...props} schema={getSchema()}>
      {(form) => (
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
                  <fieldset data-felte-keep-on-remove>
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
          </div>
          <CheckboxField name="isRemote" />
          <RichTextViewEdit name="notes" viewMode={props.viewMode} staticPersistenceKey="meeting.notes" />
          <Show when={dictionaries()?.get("meetingResource").allPositions.length}>
            <div class="flex flex-col items-stretch">
              <DictionarySelect
                name="resources"
                dictionary="meetingResource"
                itemFunc={(pos, defItem) => {
                  const conflict = () =>
                    props.viewMode && props.meeting?.["resourceConflicts.*.resourceDictId"]?.includes(pos.id);
                  return {
                    ...defItem(),
                    label: () => (
                      <span class={conflict() ? "text-red-600 font-semibold" : undefined}>
                        {defItem().text}
                        <Show when={conflict()}>
                          {" "}
                          <calendarIcons.Conflict class="inlineIcon" />
                        </Show>
                      </span>
                    ),
                  };
                }}
                multiple
                placeholder={EMPTY_VALUE_SYMBOL_STRING}
              />
              <Show
                when={
                  props.meeting?.["resourceConflicts.*.resourceDictId"]?.length
                    ? props.meeting?.["resourceConflicts.*.resourceDictId"]
                    : undefined
                }
              >
                {(conflictingResourceIds) => (
                  <LinkWithNewTabLink
                    {...getCalendarViewLinkData(`/${activeFacility()?.url}/calendar`, {
                      mode: ["week", "day"],
                      resources: conflictingResourceIds(),
                      meeting: props.meeting,
                    })}
                    onClick={(e) => {
                      // Cancel the form, but not when the new tab link is clicked.
                      if (!e.currentTarget.target) {
                        props.onCancel?.();
                      }
                    }}
                  >
                    {t("meetings.resource_conflicts.show_conflicts")}
                  </LinkWithNewTabLink>
                )}
              </Show>
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
      )}
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
