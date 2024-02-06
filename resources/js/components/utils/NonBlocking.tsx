import {JSX, ParentComponent, createSignal, getOwner, runWithOwner} from "solid-js";

interface Props {
  /** Whether to enable the non-blocking mechanism. Default: true. */
  readonly nonBlocking?: boolean;
}

/**
 * This component shows its children with zero delay.
 *
 * If there are many elements on a page, wrapping them in some number of `<NonBlocking>` components will prevent
 * the browser from freezing while rendering the page. The total loading time might increase, but the page
 * will be more responsive in the meantime.
 */
export const NonBlocking: ParentComponent<Props> = (props) => {
  // eslint-disable-next-line solid/reactivity
  if (props.nonBlocking === false) {
    // eslint-disable-next-line solid/components-return-once
    return <>{props.children}</>;
  }
  const [children, setChildren] = createSignal<JSX.Element>();
  const owner = getOwner();
  // eslint-disable-next-line solid/reactivity
  setTimeout(() => setChildren(runWithOwner(owner, () => props.children)), 0);
  return <>{children()}</>;
};
