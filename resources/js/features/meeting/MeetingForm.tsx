import {FormConfigWithoutTransformFn} from "@felte/core";
import {isAxiosError} from "axios";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {MultilineTextField} from "components/ui/form/MultilineTextField";
import {TRIM_ON_BLUR} from "components/ui/form/util";
import {Api} from "data-access/memo-api/types";
import {VoidComponent, splitProps} from "solid-js";
import {z} from "zod";
import {MeetingAttendantsFields, getAttendantsSchemaPart, getAttendantsValues} from "./MeetingAttendantsFields";
import {MeetingDateAndTime} from "./MeetingDateAndTime";
import {MeetingTypeFields} from "./MeetingTypeFields";
import {getMeetingTimeFieldsSchemaPart, getTimeValues} from "./meeting_time_controller";

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
  });

export type MeetingFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<MeetingFormType> {
  readonly id: string;
  readonly onCancel?: () => void;
}

export const MeetingForm: VoidComponent<Props> = (allProps) => {
  const [props, formPropsObj] = splitProps(allProps, ["id", "onCancel"]);
  // eslint-disable-next-line solid/reactivity
  const formProps: FormConfigWithoutTransformFn<MeetingFormType> = formPropsObj;
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
    >
      <MeetingDateAndTime
      // Does not work very well on Chrome currently.
      // suggestedTimes={{range: [8 * 60, 18 * 60], step: 30}}
      />
      <div class="flex gap-1">
        <div class="basis-0 grow">
          <MeetingTypeFields />
        </div>
        <div class="basis-0 grow">
          <DictionarySelect name="statusDictId" dictionary="meetingStatus" nullable={false} />
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <MeetingAttendantsFields name="staff" />
        <MeetingAttendantsFields name="clients" showAttendanceStatusLabel={false} />
      </div>
      <CheckboxField name="isRemote" />
      <MultilineTextField name="notes" {...TRIM_ON_BLUR} />
      <DictionarySelect name="resources" dictionary="meetingResource" multiple />
      <FelteSubmit cancel={props.onCancel} />
    </FelteForm>
  );
};

function getResourceValues(values: MeetingFormType) {
  return {
    resources: values.resources.map((resourceDictId) => ({resourceDictId})),
  };
}

export function transformFormValues(values: MeetingFormType) {
  return {
    ...values,
    ...getTimeValues(values),
    ...getAttendantsValues(values),
    ...getResourceValues(values),
  };
}
