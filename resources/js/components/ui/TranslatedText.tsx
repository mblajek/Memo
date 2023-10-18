import {JSX, Show, VoidComponent, createMemo, mergeProps} from "solid-js";
import {LangEntryFunc, LangPrefixFunc, getLangEntryFunc} from "../utils";
import {Capitalize} from "./Capitalize";

interface Props {
  /** The highest priority source. */
  override?: () => JSX.Element;
  /** The second-highest priority source. */
  langFunc?: LangEntryFunc | [func?: LangPrefixFunc, subKey?: string];
  /** Whether to capitalize. Applies to the result of the lang func only. */
  capitalize?: boolean;
  /** The last source. */
  fallbackCode?: string;
  /* The function that wraps the computed text. Called with no argument if there is no text. */
  wrapIn?: (text?: JSX.Element) => JSX.Element;
}

/**
 * Displays a text, using a system of fallbacks. The logic:
 * - Check props.override:
 *   - if specified and returns a non-empty value, it is displayed.
 *   - if specified, but returns an empty value, there is no text.
 *   - if missing or returns undefined (or null), continue:
 * - Check props.langFunc:
 *   - if fully specified and returns a non-empty value, it is displayed, capitalized if props.calitapize.
 *   - if specified, but returns an empty value, the translation code is displayed
 *   - if missing, or any part is missing, continue:
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
  const langFunc = () => {
    if (!props.langFunc) return undefined;
    if (typeof props.langFunc === "function") return props.langFunc;
    const [langPrefixFunc, subKey] = props.langFunc;
    return langPrefixFunc && subKey ? getLangEntryFunc(langPrefixFunc, subKey) : undefined;
  };
  return (
    <Show
      when={override()}
      fallback={
        <Show
          when={langFunc()}
          fallback={
            <Show when={props.fallbackCode} fallback={props.wrapIn()}>
              {props.wrapIn(<>{props.fallbackCode}</>)}
            </Show>
          }
        >
          {(langFunc) => (
            <Show when={langFunc()({defaultValue: ""})} fallback={props.wrapIn(<>{langFunc()()}</>)}>
              {(text) => props.wrapIn(<Capitalize text={text()} capitalize={props.capitalize} />)}
            </Show>
          )}
        </Show>
      }
    >
      {(override) => (
        <Show when={!override().empty} fallback={props.wrapIn()}>
          {props.wrapIn(<>{override().value}</>)}
        </Show>
      )}
    </Show>
  );
};
