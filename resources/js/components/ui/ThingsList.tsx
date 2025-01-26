import {htmlAttributes} from "components/utils/html_attributes";
import {createMemo, For, JSX, mapArray, Match, Show, splitProps, Switch} from "solid-js";

type Mode = "bullets" | "commas";

interface Props<T> extends htmlAttributes.ul {
  readonly things: readonly T[];
  readonly map?: (t: T) => JSX.Element;
  readonly mode?: Mode;
}

const SHORT_THING_MAX_LENGTH = 20;
const LONG_THING_REGEXP = /[\n,]/;

/**
 * A list, displayed either as a comma-separated list or as a bulleted list. The display mode can be forced, or
 * calculated based on the content.
 */
export const ThingsList = <T,>(allProps: Props<T>) => {
  const [props, ulProps] = splitProps(allProps, ["things", "map", "mode"]);
  const items = mapArray(
    () => props.things,
    // eslint-disable-next-line solid/reactivity
    props.map || ((t) => String(t)),
  );
  const mode = createMemo(
    (): Mode =>
      props.mode ||
      (props.things.length <= 1
        ? "commas"
        : items().every(
              (t) => typeof t === "string" && t.length <= SHORT_THING_MAX_LENGTH && !LONG_THING_REGEXP.test(t),
            )
          ? "commas"
          : "bullets"),
  );
  return (
    <Switch>
      <Match when={mode() === "commas"}>
        <ul
          {...htmlAttributes.merge(ulProps, {
            class: "inline-block",
            style: {"text-decoration": "inherit", "line-height": "1.3"},
          })}
        >
          <For each={items()}>
            {(item, i) => (
              <li class="inline-block" style={{"text-decoration": "inherit"}}>
                {item}
                <Show when={i() < items().length - 1}>
                  <span class="whitespace-pre text-grey-text font-bold mr-0.5">, </span>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Match>
      <Match when={mode() === "bullets"}>
        <ul
          {...htmlAttributes.merge(ulProps, {
            class: "list-disc list-inside",
            style: {"text-decoration": "inherit", "line-height": "1.3"},
          })}
        >
          <For each={items()}>
            {(item) => (
              <li class="whitespace-nowrap pr-1" style={{"text-decoration": "inherit"}}>
                <div class="align-top inline-block wrapTextAnywhere">{item}</div>
              </li>
            )}
          </For>
        </ul>
      </Match>
    </Switch>
  );
};
