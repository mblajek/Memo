import {JSX, Show, VoidComponent, mergeProps} from "solid-js";
import {FilterIconButton, useTable} from "..";
import {BoolFilterControl} from "./BoolFilterControl";
import s from "./ColumnFilterController.module.scss";
import {DateTimeFilterControl} from "./DateTimeFilterControl";
import {DictFilterControl} from "./DictFilterControl";
import {DictListFilterControl} from "./DictListFilterControl";
import {IntFilterControl} from "./IntFilterControl";
import {TextualFilterControl} from "./TextualFilterControl";
import {UuidFilterControl} from "./UuidFilterControl";
import {FilterControlProps} from "./types";

export interface DateTimeFilteringParams {
  readonly useDateTimeInputs?: boolean;
}

export type FilteringParams = DateTimeFilteringParams;

/** The filter controler element for the named column. */
export const ColumnFilterController: VoidComponent<FilterControlProps> = (props) => {
  const table = useTable();
  const filterControl = (): (() => JSX.Element) | undefined => {
    const column = table.getColumn(props.name);
    const meta = column?.columnDef.meta?.tquery;
    if (!column?.getCanFilter() || !meta) {
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyFilterProps: any = mergeProps({nullable: meta.nullable}, props);
    switch (meta.type) {
      case undefined:
        return undefined;
      case "bool":
        return () => <BoolFilterControl {...anyFilterProps} />;
      case "date":
      case "datetime":
        return () => (
          <DateTimeFilterControl
            {...anyFilterProps}
            columnType={meta.type}
            useDateTimeInputs={meta.filtering?.useDateTimeInputs}
          />
        );
      case "int":
        return () => <IntFilterControl {...anyFilterProps} />;
      case "list":
        return undefined;
      case "object":
        return undefined;
      case "string":
      case "text":
        return () => <TextualFilterControl {...anyFilterProps} columnType={meta.type} />;
      case "uuid":
        return () => <UuidFilterControl {...anyFilterProps} />;
      case "uuid_list":
        return undefined; // TODO: Implement.
      case "dict":
        return () => <DictFilterControl {...anyFilterProps} dictionaryId={meta.dictionaryId} />;
      case "dict_list":
        return () => <DictListFilterControl {...anyFilterProps} dictionaryId={meta.dictionaryId} />;
      default:
        return meta satisfies never;
    }
  };
  return (
    <div class={s.columnFilterController}>
      <Show when={filterControl()}>
        {(filterControl) => (
          <>
            <div class={s.filterMain}>{filterControl()()}</div>
            <div>
              <FilterIconButton isFiltering={!!props.filter} onClear={() => props.setFilter(undefined)} />
            </div>
          </>
        )}
      </Show>
    </div>
  );
};
