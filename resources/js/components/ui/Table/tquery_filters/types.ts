import {Column} from "@tanstack/solid-table";
import {RichJSONValue} from "components/persistence/serialiser";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {DataColumnSchema, DataItem} from "data-access/memo-api/tquery/types";
import {VoidComponent} from "solid-js";

export interface FilterControlProps<F extends FilterH = FilterH> {
  readonly column: Column<DataItem, unknown>;
  readonly schema: DataColumnSchema;
  readonly filter: F | undefined;
  readonly setFilter: (filter: F | undefined) => void;
}

export type FilterControl<F extends FilterH = FilterH> = VoidComponent<FilterControlProps<F>>;

export type ControlState = Readonly<Record<string, RichJSONValue>>;

export type FilterHWithState<
  C extends ControlState = ControlState,
  F extends FilterH & object = FilterH & object,
> = F & {
  readonly state?: C;
};
