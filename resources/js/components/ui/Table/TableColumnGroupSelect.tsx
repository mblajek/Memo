import {useLangFunc} from "components/utils/lang";
import {TbColumns3} from "solid-icons/tb";
import {createUniqueId, Show, VoidComponent} from "solid-js";
import {Capitalize} from "../Capitalize";
import {useDocsModalInfoIcon} from "../docs_modal";
import {closeAllSelects, Select} from "../form/Select";
import {Hr} from "../Hr";
import {title} from "../title";
import {useTable} from "./TableContext";

type _Directives = typeof title;

const NO_GROUPING_VALUE = "-";

/**
 * The controller of the table grouping.
 *
 * It currently only supports selecting a single column group.
 * TODO: Support advanced mode, where multiple groups can be selected.
 */
export const TableColumnGroupSelect: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const meta = table.options.meta?.tquery;
  const columnGroups = () => meta?.columnGroups?.();
  const activeColumnGroups = meta?.activeColumnGroups;
  const {DocsModalInfoIcon} = useDocsModalInfoIcon();
  return (
    <Show when={activeColumnGroups && columnGroups()?.length}>
      <div class="flex items-stretch">
        <span class="flex items-center text-lg cursor-default" use:title={t("tables.column_groups.feature_name")}>
          {t("tables.column_groups.grouping_symbol")}
        </span>
        <div class="w-52 grid">
          <Select
            name="columnGroup"
            items={[
              {
                value: NO_GROUPING_VALUE,
                label: () => <span class="text-grey-text">{t("tables.column_groups.no_grouping")}</span>,
                labelOnList: () => <span>{t("tables.column_groups.no_grouping")}</span>,
              },
              {value: createUniqueId(), label: () => <Hr />, disabled: true},
              ...columnGroups()!.map(({name, isFromColumn}) => ({
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
              })),
              {value: createUniqueId(), label: () => <Hr />, disabled: true},
              {
                value: createUniqueId(),
                label: () => (
                  <span>
                    {t("more_info")}{" "}
                    <DocsModalInfoIcon
                      href="/help/table-grouping"
                      title=""
                      // Close the Select.
                      onClick={() => closeAllSelects()}
                    />
                  </span>
                ),
                disabled: true,
              },
            ]}
            value={activeColumnGroups![0]()[0] || NO_GROUPING_VALUE}
            onValueChange={(v) => activeColumnGroups![1](v && v !== NO_GROUPING_VALUE ? [v] : [])}
            nullable={activeColumnGroups![0]().length > 0}
            small
          />
        </div>
      </div>
    </Show>
  );
};
