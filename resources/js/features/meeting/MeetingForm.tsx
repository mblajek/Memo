import {FormConfigWithoutTransformFn} from "@felte/core";
import {isAxiosError} from "axios";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {InfoIcon} from "components/ui/InfoIcon";
import {RichTextView} from "components/ui/RichTextView";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {FieldBox} from "components/ui/form/FieldBox";
import {MultilineTextField} from "components/ui/form/MultilineTextField";
import {PlaceholderField} from "components/ui/form/PlaceholderField";
import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {
  MeetingResource,
  MeetingResourceForCreate,
  MeetingResourceForPatch,
} from "data-access/memo-api/resources/meeting.resource";
import {Api} from "data-access/memo-api/types";
import {JSX, Show, VoidComponent, splitProps} from "solid-js";
import {z} from "zod";
import {CreatedByInfo} from "../facility-users/CreatedByInfo";
import {MeetingAttendantsFields, getAttendantsSchemaPart} from "./MeetingAttendantsFields";
import {MeetingCannedStatusEdits} from "./MeetingCannedStatusEdits";
import {MeetingDateAndTime} from "./MeetingDateAndTime";
import {MeetingTypeFields} from "./MeetingTypeFields";
import {MeetingStatusInfoIcon} from "./attendance_status_info";
import {getMeetingTimeFieldsSchemaPart} from "./meeting_time_controller";

const getSchema = () =>
  z.object({
    date: z.string(),
    ...getMeetingTimeFieldsSchemaPart(),
    typeDictId: z.string(),
    statusDictId: z.string(),
    isRemote: z.boolean(),
    ...getAttendantsSchemaPart(),
    notes: z.string(),
    resources: z.array(z.string()),
    fromMeetingId: z.string(),
  });

export type MeetingFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<MeetingFormType> {
  readonly id: string;
  readonly viewMode: boolean;
  /** The meeting resource, for showing some of the readonly information about the meeting. */
  readonly meeting?: MeetingResource;
  /** Whether the meeting date and time should start as editable, even if provided in the initial values. */
  readonly forceTimeEditable?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onCancel?: () => void;
}

export const MeetingForm: VoidComponent<Props> = (allProps) => {
  const [props, formPropsObj] = splitProps(allProps, [
    "id",
    "viewMode",
    "meeting",
    "forceTimeEditable",
    "onViewModeChange",
    "onCancel",
  ]);
  // eslint-disable-next-line solid/reactivity
  const formProps: FormConfigWithoutTransformFn<MeetingFormType> = formPropsObj;
  const t = useLangFunc();
  const {meetingStatusDict} = useFixedDictionaries();

  const ByMode: VoidComponent<{view?: JSX.Element; edit?: JSX.Element}> = (byModeProps) => (
    <Show when={props.viewMode} fallback={byModeProps.edit}>
      {byModeProps.view}
    </Show>
  );

  return (
    <FelteForm
      id={props.id}
      translationsFormNames={[props.id, "meeting"]}
      schema={getSchema()}
      translationsModel="meeting"
      class="flex flex-col gap-3"
      {...formProps}
      onError={(errorResp, ctx) => {
        formProps?.onError?.(errorResp, ctx);
        if (isAxiosError<Api.ErrorResponse>(errorResp) && errorResp.response) {
          const errors = errorResp.response.data.errors;
          // If duration is missing, but type is also missing, ignore the missing duration error. Selecting a type
          // will fill in the duration automatically for many types.
          const durationRequiredErrorIndex = errors.findIndex(
            (e) =>
              Api.isValidationError(e) &&
              e.field === "durationMinutes" &&
              (e.code === "validation.required" || e.code === "validation.present"),
          );
          if (
            durationRequiredErrorIndex >= 0 &&
            errors.some((e) => Api.isValidationError(e) && e.field === "typeDictId" && e.code === "validation.required")
          )
            errors.splice(durationRequiredErrorIndex, 1);
        }
      }}
      disabled={props.viewMode}
    >
      {(form) => (
        <>
          <PlaceholderField name="fromMeetingId" />
          <div class="flex flex-col">
            <Show when={props.meeting}>{(meeting) => <CreatedByInfo class="-mb-4" data={meeting()} />}</Show>
            <MeetingDateAndTime
              // Does not work very well on Chrome currently.
              // suggestedTimes={{range: [8 * 60, 18 * 60], step: 30}}
              viewMode={props.viewMode}
              forceEditable={props.forceTimeEditable}
            />
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
                    formProps.initialValues?.statusDictId &&
                    formProps.initialValues.statusDictId === meetingStatusDict()?.planned.id &&
                    props.onViewModeChange
                  }
                >
                  <MeetingCannedStatusEdits onViewModeChange={props.onViewModeChange!} />
                </Show>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <MeetingAttendantsFields name="staff" viewMode={props.viewMode} />
            <MeetingAttendantsFields name="clients" showAttendanceStatusLabel={false} viewMode={props.viewMode} />
          </div>
          <CheckboxField name="isRemote" />
          <ByMode
            edit={
              <MultilineTextField
                name="notes"
                label={(origLabel) => (
                  <>
                    {origLabel} <InfoIcon href="/help/rich-text" title={t("rich_text_field")} />
                  </>
                )}
                data-felte-keep-on-remove
              />
            }
            view={
              <FieldBox name="notes">
                <PlaceholderField name="notes" />
                <Show when={form.data("notes")} fallback={EMPTY_VALUE_SYMBOL}>
                  {(notes) => <RichTextView class="max-h-60" text={notes()} />}
                </Show>
              </FieldBox>
            }
          />
          <DictionarySelect name="resources" dictionary="meetingResource" multiple placeholder={EMPTY_VALUE_SYMBOL} />
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
    </FelteForm>
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
