import {FormConfigWithoutTransformFn, Obj} from "@felte/core";
import {isAxiosError} from "axios";
import {FelteForm, FormProps} from "components/felte-form/FelteForm";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {Api} from "data-access/memo-api/types";
import {splitProps} from "solid-js";
import {ZodSchema} from "zod";

export interface AbstractMeetingFormProps<MeetingFormType extends Obj>
  extends FormConfigWithoutTransformFn<MeetingFormType> {
  readonly id: string;
  readonly extraTranslationsFormNames?: readonly string[];
  readonly viewMode: boolean;
  /** The meeting resource, for showing some of the readonly information about the meeting. */
  readonly meeting?: MeetingResource;
  /** Whether the meeting date and time should start as editable, even if provided in the initial values. */
  readonly forceTimeEditable?: boolean;
  readonly allowCreateSeries?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onCancel?: () => void;
}

interface Props<MeetingFormType extends Obj> extends AbstractMeetingFormProps<MeetingFormType> {
  readonly schema: ZodSchema<MeetingFormType>;
  readonly children: FormProps<MeetingFormType>["children"];
}

export const AbstractMeetingForm = <MeetingFormType extends Obj>(allProps: Props<MeetingFormType>) => {
  const [props, formPropsObj] = splitProps(allProps, [
    "id",
    "extraTranslationsFormNames",
    "viewMode",
    "meeting",
    "forceTimeEditable",
    "allowCreateSeries",
    "onViewModeChange",
    "onCancel",
    "schema",
    "children",
  ]);
  // eslint-disable-next-line solid/reactivity
  const formProps: FormConfigWithoutTransformFn<MeetingFormType> = formPropsObj;
  return (
    <FelteForm
      id={props.id}
      translationsFormNames={[props.id, ...(props.extraTranslationsFormNames || []), "meeting", "meeting_series"]}
      schema={props.schema}
      translationsModel="meeting"
      class="flex flex-col gap-3"
      {...formProps}
      onError={(errorResp, ctx) => {
        formProps.onError?.(errorResp, ctx);
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
      {props.children}
    </FelteForm>
  );
};
