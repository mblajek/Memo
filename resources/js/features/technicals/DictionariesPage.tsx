import {A} from "@solidjs/router";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {ThingsList} from "components/ui/ThingsList";
import {title} from "components/ui/title";
import {useLangFunc} from "components/utils/lang";
import {useAllAttributes, useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {createMemo, Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {useTechnicalsMode} from "./util";

type _Directives = typeof title;

export default (() => {
  const t = useLangFunc();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const allAttributes = useAllAttributes();
  const allDictionaries = useAllDictionaries();
  const {facilityMode, scopeFilter} = useTechnicalsMode();
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
      staticPrefixQueryKey={["system", "dictionary"]}
      staticEntityURL="system/dictionary"
      staticPersistenceKey={facilityMode() ? "facilityDictionaries" : "dictionaries"}
      staticTranslations={createTableTranslations("dictionary")}
      columns={[
        {name: "id", initialVisible: false},
        {
          name: "name",
          extraDataColumns: ["id"],
          columnDef: {
            cell: cellFunc<string, {id: string}>((props) => (
              <PaddedCell>
                <ShowCellVal v={props.v}>{(v) => <A href={`./${props.row.id}`}>{v()}</A>}</ShowCellVal>
              </PaddedCell>
            )),
            enableHiding: false,
          },
        },
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
                        <Show when={facilityMode()}>
                          <span
                            class="text-grey-text"
                            use:title={t("attributes.attribs_and_dicts.positions_count_this_facility")}
                          >
                            {t("parenthesised", {text: matchingPositionsCount().get(props.row.id!)})}
                          </span>
                        </Show>
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
        {
          attributeColumns: true,
          selection: {
            model: "dictionary",
            includeFixed: true,
            fixedOverrides: {
              "positionRequiredAttributeIds": {
                columnDef: {
                  cell: cellFunc<readonly string[]>((props) => (
                    <PaddedCell>
                      <ShowCellVal v={props.v}>
                        {(ids) => (
                          <ThingsList things={ids().map((id) => `${allAttributes()?.getById(id).apiName ?? id}`)} />
                        )}
                      </ShowCellVal>
                    </PaddedCell>
                  )),
                },
              },
              "positionRequiredAttributeIds.count": false,
            },
          },
        },
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "name", desc: false}]}
      intrinsicFilter={scopeFilter()}
      savedViews
    />
  );
}) satisfies VoidComponent;
