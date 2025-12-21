import {Age} from "components/ui/Age";
import {capitalizeString} from "components/ui/Capitalize";
import {Email} from "components/ui/Email";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {LinksList} from "components/ui/LinksList";
import {Phone} from "components/ui/Phone";
import {RichTextView} from "components/ui/RichTextView";
import {SmallSpinner} from "components/ui/Spinner";
import {AttributeColumnsConfig} from "components/ui/Table/TQueryTable";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal, useTableCells} from "components/ui/Table/table_cells";
import {NullFilterControl} from "components/ui/Table/tquery_filters/NullFilterControl";
import {TextualFilterControl} from "components/ui/Table/tquery_filters/TextualFilterControl";
import {UrgentNotes} from "components/ui/UrgentNotes";
import {WarningMark} from "components/ui/WarningMark";
import {AttributeFields, AttributeParams} from "components/ui/form/AttributeFields";
import {RichTextViewEdit} from "components/ui/form/RichTextViewEdit";
import {title} from "components/ui/title";
import {getUrgentNotesData} from "components/ui/urgent_notes";
import {NON_NULLABLE} from "components/utils/array_filter";
import {attributesSelectionFromPartial, isAttributeSelected} from "components/utils/attributes_selection";
import {DATE_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {useTQueryTextFormatter} from "components/utils/tquery_text_formatter";
import {Attribute} from "data-access/memo-api/attributes";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {ClientResource, SHORT_CODE_EMPTY} from "data-access/memo-api/resources/client.resource";
import {ScrollableCell} from "data-access/memo-api/tquery/table_columns";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {ColumnType, DataColumnSchema, DataItem, isDataColumn} from "data-access/memo-api/tquery/types";
import {DateTime} from "luxon";
import {createEffect, createMemo, createSignal, on, Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

type _Directives = typeof title;

interface Props {
  readonly editMode: boolean;
  readonly showAllAttributes?: boolean;
  readonly client?: ClientResource;
}

/** The client form fields, consisting of fixed and non-fixed attributes, as well as possibly other fields. */
export const ClientFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {notificationMethodDict} = useFixedDictionaries();
  return (
    <>
      <AttributeFields
        model="client"
        minRequirementLevel={props.showAllAttributes ? undefined : props.editMode ? "optional" : "recommended"}
        nestFieldsUnder="client"
        selection={{
          model: "client",
          includeFixed: true,
          fixedOverrides: {
            shortCode: {
              isEmpty: (shortCode) => shortCode === SHORT_CODE_EMPTY,
              view: (shortCode) => (
                <Show
                  when={shortCode()}
                  fallback={
                    // Empty value is only temporary, it will be loaded with the next invalidation.
                    <SmallSpinner />
                  }
                >
                  {shortCode()}
                </Show>
              ),
            } satisfies AttributeParams<string>,
            notes: false,
            birthDate: {
              view: (date) => {
                const d = () => DateTime.fromISO(date());
                return (
                  <span>
                    {d().toLocaleString(DATE_FORMAT)}{" "}
                    <span class="text-grey-text">
                      {t("parenthesis.open")}
                      <Age birthDate={d()} />
                      {t("parenthesis.close")}
                    </span>
                  </span>
                );
              },
            } satisfies AttributeParams<string>,
            contactEmail: {
              view: (email) => <Email class="w-full" email={email()} />,
            } satisfies AttributeParams<string>,
            contactPhone: {
              view: (phone) => <Phone class="font-semibold" phone={phone()} />,
            } satisfies AttributeParams<string>,
            notificationMethodDictIds: {
              view: (methodIds, defaultView) => (
                <div class="flex flex-wrap gap-1">
                  <div>{defaultView()}</div>
                  <Show
                    when={
                      props.client &&
                      methodIds().includes(notificationMethodDict()?.sms.id || "") &&
                      !props.client.client.contactPhone
                    }
                  >
                    <div use:title={t("facility_user.client.notification_method_requires_contact_data")}>
                      <WarningMark />
                    </div>
                  </Show>
                </div>
              ),
            } satisfies AttributeParams<readonly string[]>,
            documentsLinks: {
              view: (links) => <LinksList links={links()} />,
            } satisfies AttributeParams<readonly string[]>,
          },
        }}
        editMode={props.editMode}
      />
      <RichTextViewEdit name="client.notes" viewMode={!props.editMode} staticPersistenceKey="client.notes" />
    </>
  );
};

export function useTableAttributeColumnConfigs() {
  const tableCells = useTableCells();
  return {
    client: () =>
      ({
        attributeColumns: true,
        defaultConfig: {initialVisible: false, columnGroups: "attendant_multicolumn"},
        selection: {
          model: "client",
          includeFixed: true,
          fixedOverrides: {
            "shortCode": {
              columnDef: {
                cell: cellFunc<string>((props) => (
                  <PaddedCell class="text-right">
                    <ShowCellVal
                      v={props.v === SHORT_CODE_EMPTY ? undefined : props.v}
                      fallback={<EmptyValueSymbol />}
                    />
                  </PaddedCell>
                )),
                size: 150,
              },
              filterControl: (props) => (
                <TextualFilterControl
                  {...props}
                  buildFilter={(mode, value, defaultBuildFilter) => {
                    switch (mode) {
                      case "*":
                        return {type: "column", column: props.schema.name, op: "=", val: SHORT_CODE_EMPTY, inv: true};
                      case "null":
                        return {type: "column", column: props.schema.name, op: "=", val: SHORT_CODE_EMPTY};
                      default:
                        return defaultBuildFilter(mode, value);
                    }
                  }}
                />
              ),
            },
            "typeDictId": {initialVisible: true, columnDef: {size: 180}},
            "genderDictId": {columnDef: {size: 180}},
            "birthDate": {
              initialVisible: true,
              columnDef: {cell: tableCells.dateNoWeekday()},
            },
            "addressCity": {initialVisible: true},
            "contactEmail": {
              initialVisible: true,
              columnDef: {
                cell: cellFunc<string>((props) => (
                  <PaddedCell>
                    <ShowCellVal v={props.v}>{(v) => <Email class="w-full" email={v()} />}</ShowCellVal>
                  </PaddedCell>
                )),
              },
            },
            "contactPhone": {
              initialVisible: true,
              columnDef: {
                cell: cellFunc<string>((props) => (
                  <PaddedCell>
                    <ShowCellVal v={props.v}>{(v) => <Phone phone={v()} />}</ShowCellVal>
                  </PaddedCell>
                )),
                size: 180,
              },
            },
            "documentsLinks": {
              columnDef: {
                cell: cellFunc<string[]>((props) => (
                  <PaddedCell>
                    <ShowCellVal v={props.v}>{(v) => <LinksList links={v()} />}</ShowCellVal>
                  </PaddedCell>
                )),
              },
              filterControl: NullFilterControl,
              globalFilterable: false,
            },
            "documentsLinks.count": false,
            "notificationMethodDictIds.count": false,
            "notes": {
              columnDef: {
                cell: cellFunc<string>((props) => (
                  <ScrollableCell>
                    <ShowCellVal v={props.v}>{(v) => <RichTextView text={v()} />}</ShowCellVal>
                  </ScrollableCell>
                )),
              },
            },
            "urgentNotes": {
              columnDef: {
                cell: cellFunc<string[]>((props) => (
                  <ScrollableCell>
                    <ShowCellVal v={props.v}>
                      {(v) => <UrgentNotes notes={getUrgentNotesData(v())} showInfoIcon={false} />}
                    </ShowCellVal>
                  </ScrollableCell>
                )),
              },
            },
          },
        },
      }) satisfies AttributeColumnsConfig,
  };
}

export function useClientCSVData() {
  const attributes = useAttributes();
  const tqueryTextFormatter = useTQueryTextFormatter();
  const [requestedClients, setRequestedClients] = createSignal<ReadonlyMap<string, (client: DataItem) => void>>(
    new Map(),
  );
  const selection = attributesSelectionFromPartial<(value: unknown | null) => string | undefined>({
    model: "client",
    includeFixed: true,
    fixedOverrides: {
      shortCode: (v) => (v === SHORT_CODE_EMPTY ? undefined : (v as string)),
      notes: false,
    },
  });
  const attribs = createMemo(
    (): ReadonlyMap<
      string,
      {attribute: Attribute; formatter: (type: ColumnType, value: unknown | null) => string | undefined}
    > => {
      const map = new Map<
        string,
        {attribute: Attribute; formatter: (type: ColumnType, value: unknown | null) => string | undefined}
      >();
      for (const attribute of attributes()?.getForModel("client") || []) {
        const sel = isAttributeSelected(selection, attribute);
        if (sel) {
          map.set(attribute.id, {
            attribute,
            formatter: sel.override ? (type, value) => sel.override!(value) : tqueryTextFormatter.format,
          });
        }
      }
      return map;
    },
  );
  const {schema, dataQuery} = createTQuery({
    prefixQueryKey: FacilityClient.keys.client(),
    entityURL: () => `facility/${activeFacilityId()}/user/client`,
    requestCreator: staticRequestCreator((schema) =>
      requestedClients().size
        ? {
            columns: [
              "id",
              "name",
              ...schema.columns
                .filter(
                  (col) => isDataColumn(col) && col.attributeId && !col.transform && attribs().has(col.attributeId),
                )
                .map((col) => col.name),
              "client.notes",
              "client.groups.count",
              "firstMeetingDate",
              "lastMeetingDate",
              "completedMeetingsCount",
              "completedMeetingsCountLastMonth",
              "plannedMeetingsCount",
              "plannedMeetingsCountNextMonth",
              "client.createdAt",
              "client.createdBy.name",
              "client.updatedAt",
              "client.updatedBy.name",
            ].map((column) => ({type: "column", column})),
            filter: {type: "column", column: "id", op: "in", val: [...requestedClients().keys()]},
            sort: [],
            paging: {size: requestedClients().size},
          }
        : undefined,
    ),
  });
  function getClient(id: string) {
    return new Promise<DataItem>((resolve) =>
      setRequestedClients((prev) => {
        const prevCallback = prev.get(id);
        return new Map(prev).set(id, (client) => {
          prevCallback?.(client);
          resolve(client);
        });
      }),
    );
  }
  createEffect(
    on([() => dataQuery.data?.data, () => dataQuery.dataUpdatedAt], ([data]) => {
      if (data?.length) {
        setRequestedClients((prev) => {
          const newMap = new Map(prev);
          for (const client of data) {
            const id = client.id as string;
            const callback = newMap.get(id);
            if (callback) {
              callback(client);
              newMap.delete(id);
            }
          }
          return newMap;
        });
      }
    }),
  );
  const dataColumnsByName = createMemo(
    (): ReadonlyMap<string, DataColumnSchema> =>
      new Map(
        schema()
          ?.columns.filter(isDataColumn)
          .map((col) => [col.name, col]),
      ),
  );
  const translations = createTableTranslations(["client", "facility_user", "user"]);
  type Record = readonly [field: string, value: string | undefined];
  async function getCSVData(clientId: string): Promise<readonly Record[]> {
    const client = await getClient(clientId);
    function val(key: string) {
      const value = client[key];
      if (value === undefined) {
        throw new Error(`Key not found: ${key}`);
      }
      return value;
    }
    function columnPair(dataColumn: string, translationColumn = dataColumn): Record {
      const cols = dataColumnsByName();
      if (!cols) {
        return ["", ""];
      }
      const col = cols.get(dataColumn);
      if (!col) {
        throw new Error(`Column not found: ${dataColumn}`);
      }
      return [
        capitalizeString(translations.columnName(translationColumn)),
        tqueryTextFormatter.format(col.type, val(col.name)),
      ];
    }
    return [
      columnPair("name"),
      ...(schema()
        ?.columns.map((col): [string, string | undefined] | undefined => {
          if (!isDataColumn(col) || !col.attributeId || col.transform) {
            return undefined;
          }
          const attrib = attribs().get(col.attributeId);
          return attrib
            ? [capitalizeString(attrib.attribute.label), attrib.formatter(col.type, val(col.name))]
            : undefined;
        })
        .filter(NON_NULLABLE) || []),
      columnPair("client.notes", "notes"),
      ["", ""],
      columnPair("client.groups.count"),
      columnPair("firstMeetingDate"),
      columnPair("lastMeetingDate"),
      columnPair("completedMeetingsCount"),
      columnPair("completedMeetingsCountLastMonth"),
      columnPair("plannedMeetingsCount"),
      columnPair("plannedMeetingsCountNextMonth"),
      ["", ""],
      columnPair("id"),
      columnPair("client.createdAt"),
      columnPair("client.createdBy.name"),
      columnPair("client.updatedAt"),
      columnPair("client.updatedBy.name"),
    ];
  }
  return {getCSVData};
}
