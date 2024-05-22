import {useLangFunc} from "components/utils";
import {TbColumns3} from "solid-icons/tb";
import {Show, VoidComponent} from "solid-js";
import {Capitalize} from "../Capitalize";
import {Select} from "../form/Select";
import {EMPTY_VALUE_SYMBOL_STRING} from "../symbols";
import {title} from "../title";
import {useTable} from "./TableContext";

const _DIRECTIVES_ = null && title;

/** The controller of the table grouping. */
export const TableColumnGroupSelect: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const meta = table.options.meta?.tquery;
  const columnGroups = () => meta?.columnGroups?.();
  const activeColumnGroups = meta?.activeColumnGroups;
  return (
    <Show when={activeColumnGroups && columnGroups()?.length}>
      <div class="flex items-stretch gap-1">
        <span class="flex items-center text-nowrap">{t("tables.column_groups.grouping_prefix")}</span>
        <div class="w-52 grid">
          <Select
            name="columnGroup"
            items={columnGroups()!.map(({name, isFromColumn}) => ({
              value: name,
              label: () => (
                <span>
                  <Show when={!isFromColumn}>
                    <span use:title={t("tables.column_groups.explicit_group")}>
                      <TbColumns3 class="inlineIcon strokeIcon" />
                    </span>{" "}
                  </Show>
                  <Capitalize text={table.options.meta?.translations?.columnGroup(name)} />
                </span>
              ),
            }))}
            placeholder={EMPTY_VALUE_SYMBOL_STRING}
            multiple
            value={activeColumnGroups![0]()}
            onValueChange={activeColumnGroups![1]}
            small
          />
        </div>
      </div>
    </Show>
  );
};
