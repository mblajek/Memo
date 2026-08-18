import {useParams} from "@solidjs/router";
import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {System} from "data-access/memo-api/groups/System";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {VoidComponent} from "solid-js";
import {DictionaryHeader} from "./DictionaryHeader";
import {useTechnicalsTableColumns} from "./technicals_tables";

export default (() => {
  const params = useParams();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const positionColumns = useTechnicalsTableColumns().dictionaryPositionColumns({
    dictionaryId: () => params.dictionaryId!,
    dictFiltersEnabled: false,
  });
  const intrinsicFilter = (): FilterH => ({
    type: "column",
    column: "dictionary.id",
    op: "=",
    val: params.dictionaryId!,
  });
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={System.keys.position()}
      staticEntityURL="system/position"
      staticPersistenceKey="dictionaryPositions"
      staticTranslations={createTableTranslations("position")}
      header={<DictionaryHeader dictionaryId={params.dictionaryId!} />}
      intrinsicFilter={intrinsicFilter()}
      columns={[
        {name: "id", initialVisible: false},
        {name: "defaultOrder", columnDef: {enableColumnFilter: false, sortDescFirst: false, size: 100}},
        {name: "name", columnDef: {enableHiding: false}},
        {name: "facility.id", initialVisible: false, columnGroups: "facility.name"},
        {name: "facility.name", columnGroups: true},
        {name: "isFixed", columnDef: {size: 100}},
        {name: "isDisabled", columnDef: {size: 100}},
        ...positionColumns(),
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "defaultOrder", desc: false}]}
      savedViews
    />
  );
}) satisfies VoidComponent;
