import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {ColumnName} from "data-access/memo-api/tquery/types";
import {Accessor, batch, createComputed, createSignal, on, Signal} from "solid-js";
import {useTable} from "../TableContext";

type AnyFilterState = unknown;

/**
 * A collection of local states of the column filters.
 *
 * This is a single object (as opposed to each filter defining its own state) so that the states can be
 * backed up and restored together, e.g. in the history.state.
 */
export class ColumnFilterStates {
  private readonly states;
  private readonly setStates;

  constructor() {
    const [states, setStates] = createSignal<ReadonlyMap<string, Signal<AnyFilterState | undefined>>>(new Map());
    this.states = states;
    this.setStates = setStates;
  }

  /**
   * Returns or creates a state signal.
   *
   * The signal is identified by column name and an optional signal name (if a column filter has more than one signal).
   *
   * The initial value is only used if the signal is created, or if it exists but has no value yet.
   */
  getStateSignal<T>({column, signalName, initial}: {column: ColumnName; signalName?: string; initial?: T}) {
    return this.getStateSignalByKey(signalName ? `${column}:${signalName}` : column, initial);
  }

  private getStateSignalByKey<T>(stateKey: string, initial?: T) {
    let signal = this.states().get(stateKey);
    if (signal) {
      if (initial !== undefined && signal[0]() === undefined) {
        signal[1](() => initial);
      }
    } else {
      const [get, set] = createSignal<unknown>(initial);
      signal = [get, set];
      this.setStates(new Map(this.states()).set(stateKey, signal));
    }
    return signal as Signal<T>;
  }

  getAll() {
    const res = new Map<string, AnyFilterState>();
    for (const [key, signal] of this.states()) {
      res.set(key, signal[0]());
    }
    return res;
  }

  setAll(state: ReadonlyMap<string, AnyFilterState>) {
    batch(() => {
      for (const [key, value] of state) {
        this.getStateSignalByKey(key)[1](value);
      }
    });
  }
}

type Signals<T> = {readonly [K in keyof T]: [Accessor<T[K]>, (v: T[K]) => void]};

/**
 * Returns or creates the state signals for a column filter. The signals are stored in the table meta,
 * if available.
 *
 * The filter argument is used only to reset the signals to the initial values whenever the filter is cleared.
 */
export function getFilterStateSignal<T extends object>({
  column,
  initial,
  filter,
}: {
  column: ColumnName;
  initial: T;
  filter: Accessor<FilterH | undefined>;
}): Signals<T> {
  const table = useTable();
  const result: Partial<Signals<T>> = {};
  const states = table.options.meta?.columnFilterStates;
  for (const [signalName, signalInitial] of Object.entries(initial)) {
    const [get, set] = states
      ? states.getStateSignal({column, signalName, initial: signalInitial})
      : // eslint-disable-next-line solid/reactivity
        createSignal(signalInitial);
    // Reset the state when the filter is cleared. Ignore other filter changes.
    result[signalName as keyof T] = [get, set];
  }
  createComputed(
    on(filter, (filter, prevFilter) => {
      if (prevFilter && !filter) {
        for (const [signalName, signalInitial] of Object.entries(initial)) {
          result[signalName as keyof T]?.[1](signalInitial);
        }
      }
    }),
  );
  return result as Signals<T>;
}
