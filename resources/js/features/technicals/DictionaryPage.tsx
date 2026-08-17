import {useParams} from "@solidjs/router";
import {CopyToClipboard} from "components/ui/CopyToClipboard";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {useLangFunc} from "components/utils/lang";
import {useAllAttributes, useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {createMemo, Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {useTechnicalsMode} from "./util";

type _Directives = typeof title;

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const {facilityMode, scopeFilter} = useTechnicalsMode();
  const allDictionaries = useAllDictionaries();
  const allAttributes = useAllAttributes();
  const dictionary = () => allDictionaries()?.get(params.dictionaryId!);
  const positionLabelCell = cellFunc<string>((props) => (
    <PaddedCell>
      <ShowCellVal v={props.v}>
        {(positionId) => {
          try {
            return <>{allDictionaries()?.getPositionById(positionId())?.label ?? positionId()}</>;
          } catch {
            return <>{positionId()}</>;
          }
        }}
      </ShowCellVal>
    </PaddedCell>
  ));
  const attributeColumns = createMemo(() => {
    const dict = dictionary();
    const attributes = allAttributes();
    if (!dict || !attributes) {
      return [];
    }
    return (dict.resource.positionRequiredAttributeIds ?? [])
      .map((id) => attributes.getById(id))
      .filter((attribute) => !attribute.resource.facilityId)
      .sort((a, b) => a.resource.defaultOrder - b.resource.defaultOrder)
      .map((attribute) => ({
        name: `position.${attribute.apiName}`,
        // Dict filters use a facility-scoped position dropdown, so only allow filtering them when the
        // table itself is scoped to the active facility.
        ...(attribute.type === "dict"
          ? {columnDef: {cell: positionLabelCell, enableColumnFilter: facilityMode()}}
          : {}),
      }));
  });
  const isFromOtherFacility = createMemo(() => {
    const dict = dictionary();
    return facilityMode() && dict && !facilityIdMatches(dict.resource.facilityId, activeFacilityId());
  });
  const intrinsicFilter = createMemo<FilterH>(() => {
    const dictionaryFilter: FilterH = {type: "column", column: "dictionary.id", op: "=", val: params.dictionaryId!};
    const facilityFilter = scopeFilter();
    return facilityFilter ? {type: "op", op: "&", val: [dictionaryFilter, facilityFilter]} : dictionaryFilter;
  });
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={["system", "position"]}
      staticEntityURL="system/position"
      staticPersistenceKey={facilityMode() ? "facilityDictionaryPositions" : "dictionaryPositions"}
      staticTranslations={createTableTranslations("position")}
      header={
        <Show when={dictionary()}>
          {(dictionary) => (
            <div class="mb-0.5">
              <span class="capitalize">{t("with_colon", {text: t("models.dictionary._name")})}</span>{" "}
              <b>{dictionary().name}</b>
              <Show when={isFromOtherFacility()}>
                <span use:title={t("attributes.attribs_and_dicts.dictionary_not_in_facility")}>
                  <WarningMark />
                </span>
              </Show>{" "}
              <span class="text-xs">
                (<span class="font-mono">{dictionary().id}</span>
                <CopyToClipboard text={dictionary().id} />)
              </span>
            </div>
          )}
        </Show>
      }
      intrinsicFilter={intrinsicFilter()}
      columns={[
        {name: "id", initialVisible: false},
        {name: "defaultOrder", columnDef: {enableColumnFilter: false, sortDescFirst: false, size: 100}},
        {name: "name", columnDef: {enableHiding: false}},
        {name: "facility.id", initialVisible: false, columnGroups: "facility.name"},
        {name: "facility.name", columnGroups: true},
        {name: "isFixed", columnDef: {size: 100}},
        {name: "isDisabled", columnDef: {size: 100}},
        ...attributeColumns(),
        {
          name: "position.positionGroupDictId",
          columnDef: {cell: positionLabelCell, enableColumnFilter: facilityMode()},
        },
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "defaultOrder", desc: false}]}
      savedViews
    />
  );
}) satisfies VoidComponent;
