import {Button} from "components/ui/Button";
import {actionIcons} from "components/ui/icons";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {title} from "components/ui/title";
import {useLangFunc} from "components/utils/lang";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {System} from "data-access/memo-api/groups/System";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {createMemo, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {createDictionaryCreateModal} from "./dictionary_create_modal";
import {useTechnicalsTableColumns} from "./technicals_tables";
import {facilityScopeFilter} from "./util";

type _Directives = typeof title;

export default (() => {
  const t = useLangFunc();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const technicalsCols = useTechnicalsTableColumns();
  const dictionaryCreateModal = createDictionaryCreateModal();
  const allDictionaries = useAllDictionaries();
  const matchingPositionsCount = createMemo(() => {
    const dictionaries = allDictionaries();
    const facilityId = activeFacilityId();
    const counts = new Map<string, number>();
    if (dictionaries)
      for (const dictionary of dictionaries)
        counts.set(
          dictionary.id,
          dictionary.allPositions.filter((position) => facilityIdMatches(position.resource.facilityId, facilityId))
            .length,
        );
    return counts;
  });
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={System.keys.dictionary()}
      staticEntityURL="system/dictionary"
      staticPersistenceKey="facilityDictionaries"
      staticTranslations={createTableTranslations("dictionary")}
      columns={[
        {name: "id", initialVisible: false},
        technicalsCols.dictionaryNameColumn(),
        technicalsCols.dictionaryActionsColumn({facilityMode: true}),
        technicalsCols.rawNameColumn({initialVisible: false}),
        {name: "facility.id", initialVisible: false, columnGroups: "facility.name"},
        {name: "facility.name", columnGroups: true},
        {name: "isFixed"},
        {name: "isExtendable"},
        {
          name: "positions.count",
          extraDataColumns: ["id"],
          columnDef: {
            cell: cellFunc<number, {id: string}>((props) => (
              <ShowCellVal v={props.v}>
                {(total) => (
                  <PaddedCell>
                    <div class="grid grid-cols-2 gap-2 text-right">
                      <div>
                        <span
                          class="text-grey-text"
                          use:title={t("attributes.attribs_and_dicts.positions_count_this_facility")}
                        >
                          {t("parenthesised", {text: matchingPositionsCount().get(props.row.id!)})}
                        </span>
                      </div>
                      <div>
                        <span use:title={t("attributes.attribs_and_dicts.positions_count_all_facilities")}>
                          {total()}
                        </span>
                      </div>
                    </div>
                  </PaddedCell>
                )}
              </ShowCellVal>
            )),
          },
        },
        technicalsCols.dictionaryAttributeColumns,
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "name", desc: false}]}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <Button class="secondary small" onClick={() => dictionaryCreateModal.show({facilityMode: true})}>
            <actionIcons.Add class="inlineIcon" /> {t("actions.dictionary.add")}
          </Button>
        </div>
      }
      intrinsicFilter={facilityScopeFilter()}
      savedViews
    />
  );
}) satisfies VoidComponent;
