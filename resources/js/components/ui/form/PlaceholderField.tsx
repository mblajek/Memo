import {VoidComponent} from "solid-js";

interface Props {
  readonly name: string;
}

/**
 * An invisible field that is placed in the form to support form interactions with a computed field.
 * For example if a custom component acts as a field (uses setData, setTouched etc.), it should also
 * include this field in its output.
 *
 * API fields that don't exist directly in the form, but can receive validation errors, should also
 * be present in the form as a placeholder field.
 */
export const PlaceholderField: VoidComponent<Props> = (props) => (
  <input class="hidden" id={props.name} name={props.name} data-felte-keep-on-remove />
);
