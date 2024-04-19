import {JSX} from "solid-js";
import {DOMElement} from "solid-js/jsx-runtime";
import {cx} from "./classnames";
import {skipUndefinedValues} from "./object_util";

/**
 * A collection of super-interfaces for props for components that accept HTML element attributes,
 * and a helper function for merging the attributes.
 *
 * Example:
 *
 *     interface MyComponentProps extends htmlAttributes.span {
 *       someProp: string;
 *     }
 *
 *     const MyComponent: VoidComponent<MyComponentProps> = (allProps) => {
 *       const [props, spanProps] = splitProps(allProps, ["someProp"]);
 *       return (
 *         <span
 *           {...htmlAttributes.merge(spanProps, {
 *             class: "myComponentClass",
 *             style: {{"color": myComponentColor}},
 *           })}
 *         >
 *           some prop: {props.someProp}
 *         </span>
 *       );
 *     };
 */
export namespace htmlAttributes {
  export type div = JSX.HTMLElementTags["div"];
  export type span = JSX.HTMLElementTags["span"];

  export type button = JSX.HTMLElementTags["button"];

  export type form = JSX.HTMLElementTags["form"];
  export type label = JSX.HTMLElementTags["label"];
  export type input = JSX.HTMLElementTags["input"];
  export type textarea = JSX.HTMLElementTags["textarea"];
  export type select = JSX.HTMLElementTags["select"];

  export type pre = JSX.HTMLElementTags["pre"];

  export type progress = JSX.HTMLElementTags["progress"];

  /** The events that can be overridden in a merge. Add more elements as needed. */
  const EVENT_HANDLERS = [
    "onInput",
    "onChange",
    "onClick",
    "onDblClick",
    "onMouseMove",
    "onMouseDown",
    "onMouseUp",
  ] satisfies (keyof div)[];
  type EventType = (typeof EVENT_HANDLERS)[number];

  export function merge<A extends object, O extends Pick<div, "class" | "style" | EventType>>(
    attributes: A | undefined,
    overrides: O,
  ): A & O {
    if (!attributes || !Object.keys(attributes).length) {
      return overrides as A & O;
    }
    const attribs = attributes as Partial<Record<string, unknown>>;
    const result = {...attribs, ...overrides};
    if (attribs.class !== undefined && result.class !== attribs.class) {
      result.class = cx(attribs.class as string, overrides.class);
    }
    if (attribs.style !== undefined && Object.hasOwn(overrides, "style")) {
      if (overrides.style === undefined) {
        result.style = attribs.style as JSX.CSSProperties;
      } else {
        if (typeof attribs.style !== typeof overrides.style)
          throw new Error(
            `Cannot merge style from attributes (${JSON.stringify(
              attribs.style,
            )}) and style from overrides (${JSON.stringify(overrides.style)})`,
          );
        result.style =
          typeof attribs.style === "string"
            ? `${attribs.style} ; ${overrides.style}`
            : {...attribs.style, ...skipUndefinedValues(overrides.style as JSX.CSSProperties)};
      }
    }
    for (const eventHandler of EVENT_HANDLERS) {
      if (attribs[eventHandler] && overrides[eventHandler]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result[eventHandler] = (event: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callHandler(overrides[eventHandler]! as any, event);
          callHandler(attribs[eventHandler] as JSX.EventHandlerUnion<HTMLElement, Event>, event);
        };
      }
    }
    return result as A & O;
  }

  export function callHandler<T, E extends Event>(
    handler: JSX.EventHandlerUnion<T, E> | undefined,
    event: E & {currentTarget: T; target: DOMElement},
  ) {
    if (typeof handler === "function") {
      handler(event);
    } else if (handler) {
      handler[0](handler[1], event);
    }
  }
}
