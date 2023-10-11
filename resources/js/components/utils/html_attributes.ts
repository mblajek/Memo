import {JSX} from "solid-js";
import {cx} from "./classnames";

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
 *     const MyComponent: VoidComponent<MyComponentProps> = (props) => {
 *       const [localProps, spanProps] = splitProps(props, ["someProp"]);
 *       return (
 *         <span
 *           {...htmlAttributes.merge(spanProps, {
 *             class: "myComponentClass",
 *             style: {{"color": myComponentColor}},
 *           })}
 *         >
 *           some prop: {localProps.someProp}
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
  export type select = JSX.HTMLElementTags["select"];

  export function merge<A extends object, O extends Pick<div, "class" | "style">>(
    attributes: A | undefined,
    overrides: O,
  ) {
    const attribs = (attributes || {}) as Partial<Record<string, unknown>>;
    const result = {...attribs, ...overrides};
    if (attribs.class && overrides.class) {
      result.class = cx(attribs.class as string, overrides.class);
    }
    if (attribs.style && overrides.style) {
      if (typeof attribs.style !== typeof overrides.style)
        throw new Error(
          `Cannot merge style from attributes (${JSON.stringify(
            attribs.style,
          )}) and style from overrides (${JSON.stringify(overrides.style)})`,
        );
      result.style =
        typeof attribs.style === "string"
          ? `${attribs.style} ; ${overrides.style}`
          : {...attribs.style, ...(overrides.style as JSX.CSSProperties)};
    }
    return result as A & O;
  }
}
