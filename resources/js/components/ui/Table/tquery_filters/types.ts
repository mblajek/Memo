import {FilterH} from "data-access/memo-api/tquery";
import {Component} from "solid-js";

export interface FilterControlProps<F extends FilterH = FilterH> {
  name: string;
  filter: F | undefined;
  setFilter: (filter: F | undefined) => void;
}

export type FilterControl<F extends FilterH = FilterH> = Component<FilterControlProps<F>>;
