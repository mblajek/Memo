import {ColumnFilter} from "data-access/memo-api/tquery";
import {Component} from "solid-js";

export type UnnamedColumnFilter<F extends ColumnFilter> = Omit<F, "column">;

export interface FilterControlProps<F extends ColumnFilter> {
  filter: F | undefined;
  setFilter: (filter: UnnamedColumnFilter<F> | undefined) => void;
}

export type FilterControl<F extends ColumnFilter> = Component<FilterControlProps<F>>;
