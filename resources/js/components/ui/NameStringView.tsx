import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {isNameTranslatable} from "data-access/memo-api/resources/name_string";
import {Show, VoidComponent} from "solid-js";

interface Props {
  /** The raw name. */
  readonly name: string;
  /** The translation of a translatable name. Fallback: the raw name. */
  readonly label?: string;
}

/**
 * Displays a NameString: a literal ("+"-prefixed) name is shown verbatim (without the
 * prefix) and italicised, a translatable name is shown by its translation.
 */
export const NameStringView: VoidComponent<Props> = (props) => (
  <Show
    when={isNameTranslatable(props.name)}
    fallback={
      <Show when={props.name.substring(1)} fallback={<EmptyValueSymbol />}>
        {(name) => <span class="italic">{name()}</span>}
      </Show>
    }
  >
    {props.label ?? props.name}
  </Show>
);
