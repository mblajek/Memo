import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {HideableSection} from "components/ui/HideableSection";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {TextField} from "components/ui/form/TextField";
import {Dictionaries} from "data-access/memo-api/dictionaries";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {DateTime} from "luxon";
import {Show, VoidComponent} from "solid-js";
import {z} from "zod";
import {AbstractMeetingForm, AbstractMeetingFormProps} from "./AbstractMeetingForm";
import {MeetingDateAndTime} from "./MeetingDateAndTime";
import {getMeetingSeriesSchema, MeetingSeriesControls} from "./MeetingSeriesForm";
import {WorkTimeStaffSelectField} from "./WorkTimeStaffSelectField";
import {WorkTimeTypeField} from "./WorkTimeTypeField";
import {getMeetingTimeFieldsSchemaPart} from "./meeting_time_controller";

const getSchema = () =>
  z
    .object({
      date: z.string(),
      typeDictId: z.string(),
      staff: z.string(),
      notes: z.string(),
      createSeries: z.boolean().optional(),
      fromMeetingId: z.string().optional(),
    })
    .merge(getMeetingTimeFieldsSchemaPart())
    .merge(getMeetingSeriesSchema().partial());

export type WorkTimeFormType = z.infer<ReturnType<typeof getSchema>>;

export const WorkTimeForm: VoidComponent<AbstractMeetingFormProps<WorkTimeFormType>> = (props) => {
  const {meetingTypeDict} = useFixedDictionaries();
  return (
    <AbstractMeetingForm
      {...props}
      schema={getSchema()}
      extraTranslationsFormNames={["work_time", "work_time_series", ...(props.extraTranslationsFormNames || [])]}
    >
      {(form) => {
        const isWorkTime = () => form.data("typeDictId") === meetingTypeDict()?.work_time.id;
        return (
          <>
            <div class="flex flex-col gap-1">
              <MeetingDateAndTime
                // Does not work very well on Chrome currently.
                // suggestedTimes={{range: [8 * 60, 18 * 60], step: 30}}
                viewMode={props.viewMode}
                forceEditable={props.forceTimeEditable}
                meeting={props.meeting}
                allowAllDay={!isWorkTime()}
                showSeriesInfo={!isWorkTime()}
                showSeriesLink={false}
              />
              <Show when={props.allowCreateSeries}>
                <CheckboxField name="createSeries" />
                <Show when={form.data("date")}>
                  {(date) => (
                    <fieldset data-felte-keep-on-remove>
                      <HideableSection show={form.data("createSeries")} destroyWhenFullyCollapsed>
                        <div class="pl-2 border-l-4 border-gray-400">
                          <MeetingSeriesControls startDate={DateTime.fromISO(date())} compact />
                        </div>
                      </HideableSection>
                    </fieldset>
                  )}
                </Show>
              </Show>
            </div>
            <div class="flex gap-1">
              <div class="basis-0 grow">
                <WorkTimeTypeField />
              </div>
              <div class="basis-0 grow">
                <WorkTimeStaffSelectField availableStaff={props.initialValues?.staff} />
              </div>
            </div>
            <TextField name="notes" />
            <Show when={!props.viewMode}>
              <FelteSubmit
                cancel={() => {
                  form.reset();
                  props.onCancel?.();
                }}
              />
            </Show>
          </>
        );
      }}
    </AbstractMeetingForm>
  );
};

/** Returns the meeting resource fields that are not used in the work time form. */
export function getUnusedMeetingFields(dictionaries: Dictionaries) {
  return {
    statusDictId: dictionaries.get("meetingStatus").get("planned").id,
    clients: [],
    isRemote: false,
    resources: [],
  } satisfies Partial<MeetingResource>;
}
