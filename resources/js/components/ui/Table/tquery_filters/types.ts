import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {VoidComponent} from "solid-js";

export interface FilterControlProps<F extends FilterH = FilterH> {
  name: string;
  filter: F | undefined;
  setFilter: (filter: F | undefined) => void;
}

export type FilterControl<F extends FilterH = FilterH> = VoidComponent<FilterControlProps<F>>;
