import {ControlState, FilterHWithState} from "components/ui/Table/tquery_filters/types";
import {FilterH, filterHToObject} from "data-access/memo-api/tquery/filter_utils";
import {Accessor, createComputed, createSignal, on} from "solid-js";

type Signals<C extends ControlState> = {readonly [K in keyof C]: [Accessor<C[K]>, (v: C[K]) => void]};

/**
 * Returns the states initialised with the given values. The states can be stored in the filter
 * object as a FilterHWithState using the getState function. The state is automatically restored
 * from the filter when it changes.
 */
export function getFilterControlState<C extends ControlState>({
  initial,
  filter,
}: {
  initial: C;
  filter: Accessor<FilterHWithState<C> | undefined>;
}) {
  const signalNames = Object.keys(initial) as (keyof C)[];
  const partialState: Partial<Signals<C>> = {};
  const initialFilter = filter();
  function stateFromFilter(filter: FilterHWithState<C> | undefined, signalName: keyof C) {
    return filter?.state?.[signalName] ?? initial[signalName];
  }
  for (const signalName of signalNames) {
    const [get, set] = createSignal(stateFromFilter(initialFilter, signalName));
    partialState[signalName] = [get, set];
  }
  const state = partialState as Signals<C>;
  createComputed(
    on(filter, (filter) => {
      for (const signalName of signalNames) {
        state[signalName][1](stateFromFilter(filter, signalName));
      }
    }),
  );
  return {
    state,
    getState: () => {
      const res: Partial<C> = {};
      for (const signalName of signalNames) {
        res[signalName] = state[signalName][0]();
      }
      return res as C;
    },
  };
}

export function extractFilterState(filter: FilterH | undefined): ControlState | undefined {
  return (filter as FilterHWithState | undefined)?.state;
}

/** Sets the state in the filter to the specified state. This will cause the filter control to recalculate the filter. */
export function injectFilterState(
  origFilter: FilterH | undefined,
  filterState: ControlState | undefined,
): FilterH | undefined {
  if (filterState) {
    return {
      ...(origFilter ? filterHToObject(origFilter) : ({type: "const", val: "never"} satisfies FilterH & object)),
      ...{state: filterState},
    } satisfies FilterHWithState;
  } else if (origFilter && typeof origFilter === "object") {
    const result = {...origFilter};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (result as any).state;
    return result;
  } else {
    return origFilter;
  }
}
