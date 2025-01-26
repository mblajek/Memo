import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {HideableSection} from "components/ui/HideableSection";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {TextField} from "components/ui/form/TextField";
import {Dictionaries} from "data-access/memo-api/dictionaries";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {DateTime} from "luxon";
import {Show, splitProps, VoidComponent} from "solid-js";
import {z} from "zod";
import {AbstractMeetingForm, AbstractMeetingFormProps} from "./AbstractMeetingForm";
import {MeetingDateAndTime} from "./MeetingDateAndTime";
import {getMeetingSeriesSchema, MeetingSeriesControls} from "./MeetingSeriesForm";
import {getMeetingTimeFieldsSchemaPart} from "./meeting_time_controller";
import {WorkTimeFormSubtype} from "./work_time_form_subtype";

const getSchema = () =>
  z
    .object({
      date: z.string(),
      notes: z.string(),
      createSeries: z.boolean().optional(),
      fromMeetingId: z.string().optional(),
    })
    .merge(getMeetingTimeFieldsSchemaPart())
    .merge(getMeetingSeriesSchema().partial());

export type WorkTimeFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends AbstractMeetingFormProps<WorkTimeFormType> {
  readonly subtype: WorkTimeFormSubtype;
}

export const WorkTimeForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["subtype"]);
  const {meetingTypeDict} = useFixedDictionaries();
  const isWorkTime = () => props.subtype.typeDictId === meetingTypeDict()?.work_time.id;
  return (
    <AbstractMeetingForm
      {...formProps}
      schema={getSchema()}
      extraTranslationsFormNames={["work_time", "work_time_series", ...(formProps.extraTranslationsFormNames || [])]}
    >
      {(form) => (
        <>
          <div class="flex flex-col gap-1">
            <MeetingDateAndTime
              // Does not work very well on Chrome currently.
              // suggestedTimes={{range: [8 * 60, 18 * 60], step: 30}}
              viewMode={formProps.viewMode}
              forceEditable
              meeting={formProps.meeting}
              allowAllDay={!isWorkTime()}
              showSeriesInfo={!isWorkTime()}
              showSeriesLink={false}
            />
            <Show when={formProps.allowCreateSeries}>
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
          <TextField name="notes" />
          <Show when={!formProps.viewMode}>
            <FelteSubmit
              cancel={() => {
                formProps.onCancel?.();
                form.reset();
              }}
            />
          </Show>
        </>
      )}
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
