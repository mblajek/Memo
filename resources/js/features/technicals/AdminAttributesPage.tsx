import {Button} from "components/ui/Button";
import {actionIcons} from "components/ui/icons";
import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useLangFunc} from "components/utils/lang";
import {System} from "data-access/memo-api/groups/System";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {VoidComponent} from "solid-js";
import {createAttributeCreateModal} from "./attribute_create_modal";
import {useTechnicalsTableColumns} from "./technicals_tables";

export default (() => {
  const t = useLangFunc();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const technicalsCols = useTechnicalsTableColumns();
  const attributeCols = technicalsCols.attributeColumns(
    (dictionaryId) => `/admin/technicals/dictionaries/${dictionaryId}`,
  );
  const attributeCreateModal = createAttributeCreateModal();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={System.keys.attribute()}
      staticEntityURL="system/attribute"
      staticPersistenceKey="attributes"
      staticTranslations={createTableTranslations("attribute")}
      columns={[
        {name: "id"},
        {name: "defaultOrder", columnDef: {enableColumnFilter: false, sortDescFirst: false, size: 100}},
        {name: "name"},
        technicalsCols.attributeActionsColumn({facilityMode: false}),
        {name: "facility.id", initialVisible: false, columnGroups: "facility.name"},
        {name: "facility.name", columnGroups: true},
        {name: "isFixed", columnDef: {size: 100}},
        {name: "table", columnGroups: true},
        attributeCols.apiName,
        attributeCols.type,
        {name: "dictionary.id", initialVisible: false},
        {name: "dictionary.name", initialVisible: false},
        {name: "isMultiValue"},
        {name: "requirementLevel", columnGroups: true},
        attributeCols.description,
        attributeCols.metadata,
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[
        {id: "table", desc: false},
        {id: "defaultOrder", desc: false},
      ]}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <Button class="secondary small" onClick={() => attributeCreateModal.show({facilityMode: false})}>
            <actionIcons.Add class="inlineIcon" /> {t("actions.attribute.add")}
          </Button>
        </div>
      }
      savedViews
    />
  );
}) satisfies VoidComponent;
