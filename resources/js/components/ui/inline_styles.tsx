import {JSX} from "solid-js";

/**
 * A helper function for defining inline styles that do not violate CSP. Currently SolidJS optimises
 * component creation by inlining the style attribute on native attributes, which apparently violates the
 * style-src-attr CSP directive.
 *
 * Usage:
 *
 *     <div {...style({color: "red", ...})}>...</div>
 */
export function style(style: JSX.CSSProperties | undefined) {
  return {style};
}
