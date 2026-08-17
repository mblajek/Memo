import {A} from "@solidjs/router";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {ScrollableCell, useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {Show, VoidComponent} from "solid-js";
import {useTechnicalsMode} from "./util";

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
  const {getCreatedUpdatedColumns} = useTableColumns();
  const {facilityMode, basePath, scopeFilter} = useTechnicalsMode();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={["system", "attribute"]}
      staticEntityURL="system/attribute"
      staticPersistenceKey={facilityMode() ? "facilityAttributes" : "attributes"}
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
                          <A href={`${basePath()}/dictionaries/${dictionaryId()}`}>
                            {props.row["dictionary.name"] as string}
                          </A>
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
      intrinsicFilter={scopeFilter()}
      savedViews
    />
  );
}) satisfies VoidComponent;
