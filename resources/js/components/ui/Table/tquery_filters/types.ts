import {Filter} from "data-access/memo-api/tquery";
import {Component} from "solid-js";

export interface FilterControlProps<F extends Filter = Filter> {
  name: string;
  filter: F | undefined;
  setFilter: (filter: F | undefined | ((prev: F | undefined) => F | undefined)) => void;
}

export type FilterControl<F extends Filter = Filter> =
  Component<FilterControlProps<F>>;
