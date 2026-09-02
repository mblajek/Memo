import {Button} from "components/ui/Button";
import {actionIcons} from "components/ui/icons";
import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useLangFunc} from "components/utils/lang";
import {System} from "data-access/memo-api/groups/System";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {VoidComponent} from "solid-js";
import {createDictionaryCreateModal} from "./dictionary_create_modal";
import {useTechnicalsTableColumns} from "./technicals_tables";

export default (() => {
  const t = useLangFunc();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const technicalsCols = useTechnicalsTableColumns();
  const dictionaryCreateModal = createDictionaryCreateModal();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={System.keys.dictionary()}
      staticEntityURL="system/dictionary"
      staticPersistenceKey="dictionaries"
      staticTranslations={createTableTranslations("dictionary")}
      columns={[
        {name: "id"},
        technicalsCols.dictionaryNameColumn(),
        technicalsCols.dictionaryActionsColumn({facilityMode: false}),
        technicalsCols.rawNameColumn(),
        {name: "facility.id", initialVisible: false, columnGroups: "facility.name"},
        {name: "facility.name", columnGroups: true},
        {name: "isFixed"},
        {name: "isExtendable"},
        {name: "positions.count"},
        technicalsCols.dictionaryAttributeColumns,
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "name", desc: false}]}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <Button class="secondary small" onClick={() => dictionaryCreateModal.show({facilityMode: false})}>
            <actionIcons.Add class="inlineIcon" /> {t("actions.dictionary.add")}
          </Button>
        </div>
      }
      savedViews
    />
  );
}) satisfies VoidComponent;
