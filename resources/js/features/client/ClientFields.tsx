import {Age} from "components/ui/Age";
import {Email} from "components/ui/Email";
import {LinksList} from "components/ui/LinksList";
import {Phone} from "components/ui/Phone";
import {RichTextView} from "components/ui/RichTextView";
import {SmallSpinner} from "components/ui/Spinner";
import {cellFunc, PaddedCell, ShowCellVal, useTableCells} from "components/ui/Table";
import {AttributeColumnsConfig} from "components/ui/Table/TQueryTable";
import {NullFilterControl} from "components/ui/Table/tquery_filters/NullFilterControl";
import {TextualFilterControl} from "components/ui/Table/tquery_filters/TextualFilterControl";
import {WarningMark} from "components/ui/WarningMark";
import {AttributeFields, AttributeParams} from "components/ui/form/AttributeFields";
import {RichTextViewEdit} from "components/ui/form/RichTextViewEdit";
import {EmptyValueSymbol} from "components/ui/symbols";
import {title} from "components/ui/title";
import {DATE_FORMAT, useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {ClientResource, SHORT_CODE_EMPTY} from "data-access/memo-api/resources/client.resource";
import {ScrollableCell} from "data-access/memo-api/tquery/table_columns";
import {DateTime} from "luxon";
import {Show, VoidComponent} from "solid-js";

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
              view: (email) => <Email email={email()} />,
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
          },
        },
      }) satisfies AttributeColumnsConfig,
  };
}
