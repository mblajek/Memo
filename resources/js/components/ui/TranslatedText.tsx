import {TOptions} from "i18next";
import {JSX, Match, Show, Switch, VoidComponent, createMemo, mergeProps} from "solid-js";
import {Capitalize} from "./Capitalize";

interface Props {
  /** The highest priority source. */
  readonly override?: () => JSX.Element;
  /** The second-highest priority source. */
  readonly langFunc?: (o?: TOptions) => string;
  /** Whether to capitalize. Applies to the result of the lang func only. */
  readonly capitalize?: boolean;
  /** The last source. */
  readonly fallbackCode?: string;
  /* The function that wraps the computed text. Called with no argument if there is no text. */
  readonly wrapIn?: (text?: JSX.Element) => JSX.Element;
}

/**
 * Displays a text, using a system of fallbacks. The logic:
 * - Check props.override:
 *   - if specified and returns a non-empty value, it is displayed.
 *   - if specified, but returns an empty value, there is no text.
 *   - if missing or returns undefined (or null), continue:
 * - Check props.langFunc:
 *   - if specified and returns a non-empty value, it is displayed, capitalized if props.calitapize.
 *   - if specified, but returns an empty value, the translation code is displayed
 *   - if missing, continue:
 * - Check props.fallbackCode:
 *   - if present and non-empty, it is displayed.
 *   - if missing or empty, there is no text.
 *
 * The wrapIn prop allows including a part of HTML only if the value of the TranslatedText is present.
 * For example this code will only create the <label> element if some text is displayed:
 *
 *     <TranslatedText ... wrapIn={text => text && <label>{text}</label>} />
 *
 * This class has some quite complicated logic, which avoids complicated logic in places that show
 * user text that can originate from multiple sources. An example can be a field label, which can use
 * a translation system by default, with a possible override for a particular field, and with a fallback
 * code displayed if nothing else gives a value.
 */
export const TranslatedText: VoidComponent<Props> = (allProps) => {
  const props = mergeProps({capitalize: false, wrapIn: (text?: JSX.Element) => text} satisfies Props, allProps);
  const override = createMemo(() => {
    const value = props.override?.();
    return value == undefined ? undefined : {value, empty: value === "" || (Array.isArray(value) && !value.length)};
  });
  return (
    <Switch fallback={props.wrapIn()}>
      <Match when={override()}>
        {(override) => (
          <Show when={!override().empty} fallback={props.wrapIn()}>
            {props.wrapIn(<>{override().value}</>)}
          </Show>
        )}
      </Match>
      <Match when={props.langFunc}>
        {(langFunc) => (
          <Show when={langFunc()({defaultValue: ""})} fallback={props.wrapIn(<>{langFunc()()}</>)}>
            {(text) => props.wrapIn(<Capitalize text={text()} capitalize={props.capitalize} />)}
          </Show>
        )}
      </Match>
      <Match when={props.fallbackCode}>{props.wrapIn(<>{props.fallbackCode}</>)}</Match>
    </Switch>
  );
};
