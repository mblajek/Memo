import {useParams} from "@solidjs/router";
import {Button} from "components/ui/Button";
import {actionIcons} from "components/ui/icons";
import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useLangFunc} from "components/utils/lang";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {System} from "data-access/memo-api/groups/System";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {createMemo, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {DictionaryHeader} from "./DictionaryHeader";
import {createPositionCreateModal} from "./position_create_modal";
import {createPositionReorderModal} from "./position_reorder_modal";
import {useTechnicalsTableColumns} from "./technicals_tables";
import {anyPositionMovable, facilityScopeFilter} from "./util";

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const allDictionaries = useAllDictionaries();
  const positionCreateModal = createPositionCreateModal();
  const positionReorderModal = createPositionReorderModal();
  const extendable = () => allDictionaries()?.byId.get(params.dictionaryId!)?.resource.isExtendable ?? false;
  const reorderPossible = () =>
    anyPositionMovable(allDictionaries()?.get(params.dictionaryId!), {
      scopeFacilityId: activeFacilityId(),
      facilityMode: true,
    });
  const technicalsCols = useTechnicalsTableColumns();
  const positionColumns = technicalsCols.dictionaryPositionColumns({
    dictionaryId: () => params.dictionaryId!,
    dictFiltersEnabled: true,
  });
  const intrinsicFilter = createMemo<FilterH>(() => ({
    type: "op",
    op: "&",
    val: [{type: "column", column: "dictionary.id", op: "=", val: params.dictionaryId!}, facilityScopeFilter()],
  }));
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={System.keys.position()}
      staticEntityURL="system/position"
      staticPersistenceKey="facilityDictionaryPositions"
      staticTranslations={createTableTranslations("position")}
      header={<DictionaryHeader dictionaryId={params.dictionaryId!} warnNotInFacility />}
      intrinsicFilter={intrinsicFilter()}
      columns={[
        {name: "id", initialVisible: false},
        {name: "defaultOrder", columnDef: {enableColumnFilter: false, sortDescFirst: false, size: 100}},
        {name: "name", columnDef: {enableHiding: false}},
        technicalsCols.positionActionsColumn({facilityMode: true}),
        {name: "facility.id", initialVisible: false, columnGroups: "facility.name"},
        {name: "facility.name", columnGroups: true},
        {name: "isFixed", columnDef: {size: 100}},
        {name: "isDisabled", columnDef: {size: 100}},
        ...positionColumns(),
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "defaultOrder", desc: false}]}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <Button
            class="secondary small"
            disabled={!extendable()}
            title={extendable() ? undefined : t("validation.not_extendable")}
            onClick={() => positionCreateModal.show({dictionaryId: params.dictionaryId!, facilityMode: true})}
          >
            <actionIcons.Add class="inlineIcon" /> {t("actions.position.add")}
          </Button>
          <Button
            class="secondary small"
            disabled={!reorderPossible()}
            title={reorderPossible() ? undefined : t("forms.reorder.nothing_movable")}
            onClick={() => positionReorderModal.show({dictionaryId: params.dictionaryId!, facilityMode: true})}
          >
            <actionIcons.Reorder class="inlineIcon" /> {t("actions.reorder")}
          </Button>
        </div>
      }
      savedViews
    />
  );
}) satisfies VoidComponent;
