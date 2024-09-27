import {children, createComputed, ParentComponent} from "solid-js";
import {NON_NULLABLE} from "./array_filter";

interface GetRefsProps {
  readonly refs: (refs: HTMLElement[]) => void;
  /** Whether to silently ignore non-HTMLElement children and just set refs to empty array. Default: false. */
  readonly silentErrors?: boolean;
}

/**
 * Gets the reference of the child HTMLElements.
 * Children must consist of only HTMLElements (null and undefined children are ignored).
 */
export const GetRefs: ParentComponent<GetRefsProps> = (props) => {
  const ch = children(() => props.children);
  createComputed(() => {
    const childrenArr = ch.toArray().filter(NON_NULLABLE);
    if (!childrenArr.every((ch) => ch instanceof HTMLElement)) {
      if (!props.silentErrors) {
        console.error("GetRefs children must be HTMLElements, got:", childrenArr);
      }
      props.refs([]);
      return;
    }
    props.refs(childrenArr);
  });
  return <>{ch()}</>;
};

interface GetRefProps {
  readonly ref: (ref: HTMLElement | undefined) => void;
  /** Whether to silently ignore non-HTMLElement child and just set ref to undefined. Default: false. */
  readonly silentErrors?: boolean;
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
          if (!props.silentErrors) {
            console.error("GetRef must have exactly one HTMLElement child, got:", refs);
          }
          props.ref(undefined);
          return;
        }
        props.ref(refs[0]);
      }}
      silentErrors={props.silentErrors}
    >
      {props.children}
    </GetRefs>
  );
};
