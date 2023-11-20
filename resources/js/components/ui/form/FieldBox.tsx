import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {ParentComponent} from "solid-js";
import {FieldLabel} from "./FieldLabel";

interface Props {
  readonly name: string;
  readonly label?: string;
}

export const FieldBox: ParentComponent<Props> = (props) => (
  <div class="flex flex-col items-stretch gap-0.25">
    <FieldLabel fieldName={props.name} text={props.label} />
    {props.children}
    <ValidationMessages fieldName={props.name} />
  </div>
);
