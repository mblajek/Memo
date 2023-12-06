import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {MultilineTextField} from "components/ui/form/MultilineTextField";
import {TRIM_ON_BLUR} from "components/ui/form/util";
import {VoidComponent, splitProps} from "solid-js";
import {z} from "zod";
import {MeetingDateAndTime} from "./MeetingDateAndTime";
import {MeetingTypeFields} from "./MeetingTypeFields";
import {meetingTimeFieldsSchemaPart, transformTimeValues} from "./meeting_time_controller";

const getSchema = () =>
  z.object({
    date: z.string(),
    ...meetingTimeFieldsSchemaPart(),
    typeDictId: z.string(),
    statusDictId: z.string(),
    isRemote: z.boolean(),
    notes: z.string(),
    resources: z.array(z.string()),
  });

export type MeetingFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<MeetingFormType> {
  readonly id: string;
  readonly onCancel?: () => void;
}

export const MeetingForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "onCancel"]);
  return (
    <FelteForm id={props.id} schema={getSchema()} class="flex flex-col gap-4" {...formProps}>
      <div class="flex flex-col gap-1">
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
      </div>
      {/* TODO: Add clients, staff. */}
      <CheckboxField name="isRemote" />
      <MultilineTextField name="notes" {...TRIM_ON_BLUR} />
      <DictionarySelect name="resources" dictionary="meetingResource" multiple />
      <FelteSubmit cancel={props.onCancel} />
    </FelteForm>
  );
};

export function transformFormValues(values: MeetingFormType) {
  return {
    ...values,
    ...transformTimeValues(values),
    resources: values.resources.map((resourceDictId) => ({resourceDictId})),
  };
}
