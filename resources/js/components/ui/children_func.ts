/**
 * @fileoverview Utilities for creating components that can take children in the function form,
 * like Show does.
 */

import {JSX} from "solid-js";

/** Parameters for the children function. There needs to be at least one parameter. */
type ChildrenFuncParams = [unknown, ...unknown[]];

/** A function that can be specified as props.children. */
export type ChildrenFunc<P extends ChildrenFuncParams> = (...params: P) => JSX.Element;

/**
 * The type of props.children that can accept either an element directly, or a children function.
 * Use getChildrenElement on props.children to retrieve the element or call the children function.
 */
export type ChildrenOrFunc<P extends ChildrenFuncParams> = JSX.Element | ChildrenFunc<P>;

/**
 * Returns the children elements based on props children (which can be elements or a children function)
 * and arguments for the children fuction.
 */
export function getChildrenElement<P extends ChildrenFuncParams>(
  propsChildren: ChildrenOrFunc<P>,
  ...args: P
): JSX.Element {
  return isChildrenFunc(propsChildren) ? propsChildren(...args) : propsChildren;
}

export function isChildrenFunc<P extends ChildrenFuncParams>(children: ChildrenOrFunc<P>): children is ChildrenFunc<P> {
  return typeof children === "function" && children.length > 0;
}
