import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {For, ParentComponent} from "solid-js";
import {FieldLabel} from "./FieldLabel";

interface Props {
  readonly name: string;
  readonly label?: string;
  readonly validationMessagesForFields?: readonly string[];
}

export const FieldBox: ParentComponent<Props> = (props) => (
  <div class="flex flex-col items-stretch gap-0.25">
    <FieldLabel fieldName={props.name} text={props.label} />
    {props.children}
    <For each={props.validationMessagesForFields || [props.name]}>
      {(fieldName) => <ValidationMessages fieldName={fieldName} />}
    </For>
  </div>
);
