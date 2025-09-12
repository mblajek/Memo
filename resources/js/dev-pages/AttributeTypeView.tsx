import {A} from "@solidjs/router";
import {Attribute} from "data-access/memo-api/attributes";
import {Match, Switch, VoidComponent} from "solid-js";

interface Props {
  readonly attr: Attribute;
}

export const AttributeTypeView: VoidComponent<Props> = (props) => {
  return (
    <Switch fallback={<>{props.attr.type}</>}>
      <Match when={props.attr.type === "dict"}>
        dict: <A href={`/dev/dictionaries/${props.attr.dictionary!.id}`}>{props.attr.dictionary!.name}</A>
      </Match>
      <Match when={props.attr.typeModel}>model: ${props.attr.typeModel}</Match>
    </Switch>
  );
};
