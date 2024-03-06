import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {VoidComponent} from "solid-js";

export interface FilterControlProps<F extends FilterH = FilterH> {
  readonly name: string;
  readonly nullable?: boolean;
  readonly filter: F | undefined;
  readonly setFilter: (filter: F | undefined) => void;
}

export type FilterControl<F extends FilterH = FilterH> = VoidComponent<FilterControlProps<F>>;
