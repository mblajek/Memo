import {JSX, VoidComponent, createSignal, onCleanup, onMount} from "solid-js";

const [globalPageElements, setGlobalPageElements] = createSignal<JSX.Element[]>([]);

export interface GlobalPageElementArgs<T> {
  params(): T | undefined;
  setParams(params: T | undefined): void;
  clearParams(): void;
}

/**
 * Registers a new global page element, e.g. a modal that can be invoked from any page.
 * A global page element is typically a modal, but it's not a requirement.
 *
 * Usage example:
 * - in foo.tsx:
 *
 *       const createFooModal = registerGlobalPageElement<string>(({params, clearParams}) => (
 *         <Modal open={params()} onClose={clearParams}>
 *           {(params) => <div>params: {params()}</div>}
 *         </Modal>
 *       ));
 *
 * - in a component using the foo modal:
 *
 *       const fooModal = createFooModal();
 *       return <button onClick={() => fooModal.show("bar")}>show foo</button>;
 *
 * Without specifying T, params are of type `true|undefined`, and `fooModal.show()` doesn't need
 * parameters.
 */
export function registerGlobalPageElement<T = true>(
  globalPageElement: (args: GlobalPageElementArgs<T>) => JSX.Element,
) {
  return () => {
    const [params, setParams] = createSignal<T>();
    onMount(() => {
      const element = globalPageElement({
        params,
        setParams,
        clearParams: () => setParams(undefined),
      });
      setGlobalPageElements((old) => [...old, element]);
      onCleanup(() => {
        setGlobalPageElements((old) => old.filter((e) => e !== element));
      });
    });
    return {
      getValue: params,
      show: (...args: T extends true ? [(T | undefined)?] : [T | undefined]) => {
        const [newValue = true as T] = args;
        if (params() !== undefined) {
          throw new Error("Global page element already shown");
        }
        setParams(() => newValue);
      },
      hide: () => setParams(undefined),
    };
  };
}

/**
 * The global page elements, e.g. modals, declared using registerGlobalPageElement and displayed by
 * any component. Should be always included in the app.
 */
export const GlobalPageElements: VoidComponent = () => <div>{globalPageElements()}</div>;
