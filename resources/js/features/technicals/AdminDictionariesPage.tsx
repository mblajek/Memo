import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {System} from "data-access/memo-api/groups/System";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {VoidComponent} from "solid-js";
import {useTechnicalsTableColumns} from "./technicals_tables";

export default (() => {
  const {getCreatedUpdatedColumns} = useTableColumns();
  const technicalsCols = useTechnicalsTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={System.keys.dictionary()}
      staticEntityURL="system/dictionary"
      staticPersistenceKey="dictionaries"
      staticTranslations={createTableTranslations("dictionary")}
      columns={[
        {name: "id"},
        technicalsCols.dictionaryColumns.name,
        {name: "facility.id", initialVisible: false, columnGroups: "facility.name"},
        {name: "facility.name", columnGroups: true},
        {name: "isFixed"},
        {name: "isExtendable"},
        {name: "positions.count"},
        technicalsCols.dictionaryAttributeColumns,
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "name", desc: false}]}
      savedViews
    />
  );
}) satisfies VoidComponent;
