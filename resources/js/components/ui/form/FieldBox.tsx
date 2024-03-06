import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {For, JSX, ParentComponent} from "solid-js";
import {FieldLabel} from "./FieldLabel";

interface Props {
  readonly name: string;
  /** Whether this is a collection of fields, grouped with an umbrella label. Default: false. */
  readonly umbrella?: boolean;
  readonly label?: JSX.Element;
  readonly validationMessagesForFields?: readonly string[];
}

export const FieldBox: ParentComponent<Props> = (props) => (
  <div class="flex flex-col items-stretch">
    <FieldLabel fieldName={props.name} umbrella={props.umbrella} text={props.label} />
    {props.children}
    <For each={props.validationMessagesForFields || [props.name]}>
      {(name) => <ValidationMessages fieldName={name} />}
    </For>
  </div>
);
