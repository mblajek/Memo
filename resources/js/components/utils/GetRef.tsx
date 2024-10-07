import {children, createComputed, createEffect, ParentComponent} from "solid-js";
import {NON_NULLABLE} from "./array_filter";

interface GetRefsProps {
  readonly refs: (refs: HTMLElement[]) => void;
  /** Whether to wait with setting the refs to after mount. */
  readonly waitForMount?: boolean;
}

/**
 * Gets the reference of the child HTMLElements.
 * Children must consist of only HTMLElements (null and undefined children are ignored).
 *
 * Note that the ref will be set before the component is mounted.
 */
export const GetRefs: ParentComponent<GetRefsProps> = (props) => {
  const ch = children(() => props.children);
  const effectFunc = () => {
    const childrenArr = ch.toArray().filter(NON_NULLABLE);
    if (!childrenArr.every((ch) => ch instanceof HTMLElement)) {
      console.error("GetRefs children must be HTMLElements, got:", childrenArr);
      props.refs([]);
      return;
    }
    props.refs(childrenArr);
  };
  // eslint-disable-next-line solid/reactivity
  if (props.waitForMount) {
    createEffect(effectFunc);
  } else {
    createComputed(effectFunc);
  }
  return <>{ch()}</>;
};

interface GetRefProps {
  readonly ref: (ref: HTMLElement | undefined) => void;
  /** Whether to wait with setting the ref to after mount. */
  readonly waitForMount?: boolean;
}

/**
 * Gets the reference of the child HTMLElement.
 * Children must consist of exactly zero or one HTMLElement (null and undefined children are ignored).
 */
export const GetRef: ParentComponent<GetRefProps> = (props) => {
  return (
    <GetRefs
      refs={(refs) => {
        if (refs.length > 1) {
          console.error("GetRef must have exactly one HTMLElement child, got:", refs);
          props.ref(undefined);
          return;
        }
        props.ref(refs[0]);
      }}
      waitForMount={props.waitForMount}
    >
      {props.children}
    </GetRefs>
  );
};
