import {A} from "@solidjs/router";
import {Email} from "components/ui/Email";
import {Phone} from "components/ui/Phone";
import {RichTextView} from "components/ui/RichTextView";
import {cellFunc, PaddedCell, ShowCellVal, useTableCells} from "components/ui/Table";
import {AttributeColumnsConfig} from "components/ui/Table/TQueryTable";
import {AttributeFields, AttributeParams} from "components/ui/form/AttributeFields";
import {RichTextViewEdit} from "components/ui/form/RichTextViewEdit";
import {DATE_FORMAT} from "components/utils";
import {PartialAttributesSelection} from "components/utils/attributes_selection";
import {ScrollableCell} from "data-access/memo-api/tquery/table_columns";
import {DateTime} from "luxon";
import {For, VoidComponent} from "solid-js";

interface Props {
  readonly editMode: boolean;
  readonly showAllAttributes?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DETAILS_ATTRIBUTES_SELECTION: PartialAttributesSelection<AttributeParams<any>> = {
  model: "client",
  includeFixed: true,
  fixedOverrides: {
    notes: false,
    birthDate: {
      view: (date) => <span>{DateTime.fromISO(date()).toLocaleString(DATE_FORMAT)}</span>,
    },
    contactEmail: {
      view: (email) => <Email email={email()} />,
    } satisfies AttributeParams<string>,
    contactPhone: {
      view: (phone) => <Phone class="font-semibold" phone={phone()} />,
    } satisfies AttributeParams<string>,
    documentsLinks: {
      view: (links) => (
        <div class="flex flex-col gap-1">
          <For each={links()}>
            {(link) => (
              <A
                href={link}
                target="_blank"
                class="inline-block text-sm wrapTextAnywhere"
                style={{"line-height": "normal"}}
              >
                {link}
              </A>
            )}
          </For>
        </div>
      ),
    } satisfies AttributeParams<string[]>,
  },
};

/** The client form fields, consisting of fixed and non-fixed attributes, as well as possibly other fields. */
export const ClientFields: VoidComponent<Props> = (props) => {
  return (
    <>
      <AttributeFields
        model="client"
        minRequirementLevel={props.showAllAttributes ? undefined : props.editMode ? "optional" : "recommended"}
        nestFieldsUnder="client"
        selection={DETAILS_ATTRIBUTES_SELECTION}
        editMode={props.editMode}
      />
      <RichTextViewEdit name="client.notes" viewMode={!props.editMode} persistenceKey="client.notes" />
    </>
  );
};

export function useTableAttributeColumnConfigs() {
  const tableCells = useTableCells();
  return {
    client: () =>
      ({
        attributeColumns: true,
        defaultConfig: {initialVisible: false, columnGroups: "attendant"},
        selection: {
          model: "client",
          includeFixed: true,
          fixedOverrides: {
            typeDictId: {initialVisible: true, columnDef: {size: 180}},
            genderDictId: {columnDef: {size: 180}},
            birthDate: {
              initialVisible: true,
              columnDef: {cell: tableCells.dateNoWeekday()},
            },
            addressCity: {initialVisible: true},
            contactEmail: {
              initialVisible: true,
              columnDef: {
                cell: cellFunc<string>((props) => (
                  <PaddedCell>
                    <ShowCellVal v={props.v}>{(v) => <Email class="w-full" email={v()} />}</ShowCellVal>
                  </PaddedCell>
                )),
              },
            },
            contactPhone: {
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
            notes: {
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
