import {A} from "@solidjs/router";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useLangFunc} from "components/utils/lang";
import {ScrollableCell, useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {createComputed, createSignal, Show, VoidComponent} from "solid-js";
import {activeFacilityId, useActiveFacility} from "state/activeFacilityId.state";
import {thisFacilityOnlyFilter} from "./util";

const BASE_HEIGHT = "6rem";

/** Pretty-prints the stored JSON metadata, falling back to the raw text when it is not valid JSON. */
function formatMetadata(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default (() => {
  const t = useLangFunc();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const activeFacility = useActiveFacility();
  const [thisFacilityOnly, setThisFacilityOnly] = createSignal(false);
  createPersistence({
    value: thisFacilityOnly,
    onLoad: setThisFacilityOnly,
    storage: localStorageStorage("AttrAndDict:onlyActiveFacility"),
  });
  createComputed(() => {
    if (!activeFacility()) {
      setThisFacilityOnly(false);
    }
  });
  return (
    <>
      <AppTitlePrefix prefix="Attributes" />
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={["system", "attribute"]}
        staticEntityURL="system/attribute"
        staticPersistenceKey="attributes"
        staticTranslations={createTableTranslations("attribute")}
        columns={[
          {name: "id", initialVisible: false},
          {name: "defaultOrder", columnDef: {enableColumnFilter: false, sortDescFirst: false, size: 100}},
          {name: "name"},
          {name: "facility.id", initialVisible: false, columnGroups: "facility.name"},
          {name: "facility.name", columnGroups: true},
          {name: "isFixed", columnDef: {size: 100}},
          {name: "table", columnGroups: true},
          {
            name: "apiName",
            columnDef: {
              cell: cellFunc<string>((props) => (
                <PaddedCell class="font-mono text-xs">
                  <ShowCellVal v={props.v}>{(v) => <>{v()}</>}</ShowCellVal>
                </PaddedCell>
              )),
              // Displayed camelCased but stored snake_cased, so a text filter on the raw value would mislead.
              enableColumnFilter: false,
              size: 300,
            },
          },
          {
            name: "type",
            extraDataColumns: ["dictionary.id", "dictionary.name"],
            columnGroups: true,
            columnDef: {
              cell: cellFunc<string>((props) => (
                <PaddedCell>
                  <ShowCellVal v={props.v}>
                    {(v) => (
                      <Show
                        when={v() === "dict" && (props.row["dictionary.id"] as string | null)}
                        fallback={<>{v()}</>}
                      >
                        {(dictionaryId) => (
                          <>
                            dict:{" "}
                            <A href={`/dev/dictionaries/${dictionaryId()}`}>{props.row["dictionary.name"] as string}</A>
                          </>
                        )}
                      </Show>
                    )}
                  </ShowCellVal>
                </PaddedCell>
              )),
            },
          },
          {name: "dictionary.id", initialVisible: false},
          {name: "dictionary.name", initialVisible: false},
          {name: "isMultiValue"},
          {name: "requirementLevel", columnGroups: true},
          {
            name: "description",
            columnDef: {
              cell: cellFunc<string>((props) => (
                <ScrollableCell class="whitespace-pre-wrap wrapText" baseHeight={BASE_HEIGHT}>
                  <ShowCellVal v={props.v}>{(v) => <>{v()}</>}</ShowCellVal>
                </ScrollableCell>
              )),
              size: 400,
            },
          },
          {
            name: "metadata",
            columnDef: {
              cell: cellFunc<string>((props) => (
                <ScrollableCell class="font-mono text-xs whitespace-pre-wrap" baseHeight={BASE_HEIGHT}>
                  <ShowCellVal v={props.v}>{(v) => <>{formatMetadata(v())}</>}</ShowCellVal>
                </ScrollableCell>
              )),
              // Displayed with camelCased keys but stored snake_cased, so filtering the raw value would mislead.
              enableColumnFilter: false,
              size: 300,
            },
          },
          ...getCreatedUpdatedColumns(),
        ]}
        initialSort={[
          {id: "table", desc: false},
          {id: "defaultOrder", desc: false},
        ]}
        intrinsicFilter={thisFacilityOnlyFilter(thisFacilityOnly(), activeFacilityId())}
        customSectionBelowTable={
          <Show when={activeFacility()}>
            {(activeFacility) => (
              <div class="flex items-center ml-2">
                <CheckboxInput
                  checked={thisFacilityOnly()}
                  onChecked={setThisFacilityOnly}
                  label={
                    <span class="font-normal">
                      {t("attributes.attribs_and_dicts.in_this_facility_only", {facilityName: activeFacility().name})}
                    </span>
                  }
                />
              </div>
            )}
          </Show>
        }
        savedViews
      />
    </>
  );
}) satisfies VoidComponent;
