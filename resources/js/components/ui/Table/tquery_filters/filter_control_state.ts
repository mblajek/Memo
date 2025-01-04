import {RichJSONValue} from "components/persistence/serialiser";
import {FilterHWithState} from "components/ui/Table/tquery_filters/types";
import {Accessor, createComputed, createSignal, on} from "solid-js";

export type ControlState = Readonly<Record<string, RichJSONValue>>;

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
  for (const signalName of signalNames) {
    const [get, set] = createSignal(initialFilter?.state[signalName] ?? initial[signalName]);
    partialState[signalName] = [get, set];
  }
  const state = partialState as Signals<C>;
  createComputed(
    on(filter, (filter) => {
      for (const signalName of signalNames) {
        state[signalName][1](filter ? filter.state[signalName] : initial[signalName]);
      }
    }),
  );
  return {
    state,
    getState: () =>
      Object.fromEntries(Object.entries(state).map(([signalName, signal]) => [signalName, signal[0]()])) as C,
  };
}
