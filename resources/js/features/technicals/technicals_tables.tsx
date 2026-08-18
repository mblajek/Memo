import {A} from "@solidjs/router";
import {useMutation} from "@tanstack/solid-query";
import {Button, DeleteButton, EditButton} from "components/ui/Button";
import {createConfirmation} from "components/ui/confirmation";
import {actionIcons} from "components/ui/icons";
import {AUTO_SIZE_COLUMN_DEFS} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {AttributeColumnsConfig, PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {ThingsList} from "components/ui/ThingsList";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {useAllAttributes, useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {createTableColumnsSet, ScrollableCell} from "data-access/memo-api/tquery/table_columns";
import {Accessor, createMemo, Show} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {createAttributeEditModal} from "./attribute_edit_modal";
import {createAttributeReorderModal} from "./attribute_reorder_modal";
import {createDictionaryEditModal} from "./dictionary_edit_modal";
import {createPositionReorderModal} from "./position_reorder_modal";
import {NON_FORM_MUTATION_META} from "./util";

const BASE_HEIGHT = "6rem";

/** Pretty-prints the stored JSON metadata, falling back to the raw text when it is not valid JSON. */
function formatMetadata(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

/** The table column definitions shared between the technicals tables. */
export function useTechnicalsTableColumns() {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const allAttributes = useAllAttributes();
  const allDictionaries = useAllDictionaries();

  /**
   * The edit/delete actions column of the attribute tables. In the facility variant the
   * mutations go through the facility endpoints and only the facility's own rows are mutable.
   */
  const attributeActionsColumn = ({facilityMode}: {facilityMode: boolean}): PartialColumnConfig => {
    const attributeEditModal = createAttributeEditModal();
    const attributeReorderModal = createAttributeReorderModal();
    const confirmation = createConfirmation();
    const deleteMutation = useMutation(() => ({
      mutationFn: facilityMode ? FacilityAdmin.deleteAttribute : Admin.deleteAttribute,
      meta: NON_FORM_MUTATION_META,
    }));
    async function deleteAttribute(attributeId: string) {
      await deleteMutation.mutateAsync(attributeId);
      toastSuccess(t("forms.attribute_delete.success"));
      invalidate.attributes();
    }
    return {
      name: "actions",
      isDataColumn: false,
      extraDataColumns: ["id", "name", "isFixed", "facility.id"],
      columnDef: {
        cell: (c) => {
          const row = () => c.row.original;
          const canMutate = () => !row().isFixed && (!facilityMode || row()["facility.id"] === activeFacilityId());
          return (
            <PaddedCell>
              <Show when={canMutate()}>
                <div class="flex gap-1">
                  <EditButton
                    class="minimal -my-px"
                    label=""
                    title={t("actions.edit")}
                    onClick={() => attributeEditModal.show({attributeId: row().id as string, facilityMode})}
                  />
                  <Button
                    class="minimal -my-px"
                    title={t("actions.reorder")}
                    onClick={() => attributeReorderModal.show({attributeId: row().id as string, facilityMode})}
                  >
                    <actionIcons.Reorder class="inlineIcon" />
                  </Button>
                  <DeleteButton
                    class="minimal -my-px"
                    label=""
                    title={t("actions.delete")}
                    confirm={() =>
                      confirmation.confirm({
                        title: t("forms.attribute_delete.form_name"),
                        body: t("forms.attribute_delete.confirmation_text", {
                          name: (row().name as string).replace(/^\+/, ""),
                        }),
                        confirmText: t("actions.delete"),
                      })
                    }
                    delete={() => deleteAttribute(row().id as string)}
                  />
                </div>
              </Show>
            </PaddedCell>
          );
        },
        enableSorting: false,
        enableHiding: false,
        ...AUTO_SIZE_COLUMN_DEFS,
      },
    };
  };

  /**
   * The edit/delete actions column of the dictionaries tables. In the facility variant the
   * mutations go through the facility endpoints and only the facility's own rows are mutable.
   */
  const dictionaryActionsColumn = ({facilityMode}: {facilityMode: boolean}): PartialColumnConfig => {
    const dictionaryEditModal = createDictionaryEditModal();
    const confirmation = createConfirmation();
    const deleteMutation = useMutation(() => ({
      mutationFn: facilityMode ? FacilityAdmin.deleteDictionary : Admin.deleteDictionary,
      meta: NON_FORM_MUTATION_META,
    }));
    async function deleteDictionary(dictionaryId: string) {
      await deleteMutation.mutateAsync(dictionaryId);
      toastSuccess(t("forms.dictionary_delete.success"));
      invalidate.dictionaries();
    }
    return {
      name: "actions",
      isDataColumn: false,
      extraDataColumns: ["id", "name", "isFixed", "facility.id"],
      columnDef: {
        cell: (c) => {
          const row = () => c.row.original;
          const canMutate = () => !row().isFixed && (!facilityMode || row()["facility.id"] === activeFacilityId());
          return (
            <PaddedCell>
              <Show when={canMutate()}>
                <div class="flex gap-1">
                  <EditButton
                    class="minimal -my-px"
                    label=""
                    title={t("actions.edit")}
                    onClick={() => dictionaryEditModal.show({dictionaryId: row().id as string, facilityMode})}
                  />
                  <DeleteButton
                    class="minimal -my-px"
                    label=""
                    title={t("actions.delete")}
                    confirm={() =>
                      confirmation.confirm({
                        title: t("forms.dictionary_delete.form_name"),
                        body: t("forms.dictionary_delete.confirmation_text", {
                          name: (row().name as string).replace(/^\+/, ""),
                        }),
                        confirmText: t("actions.delete"),
                      })
                    }
                    delete={() => deleteDictionary(row().id as string)}
                  />
                </div>
              </Show>
            </PaddedCell>
          );
        },
        enableSorting: false,
        enableHiding: false,
        ...AUTO_SIZE_COLUMN_DEFS,
      },
    };
  };

  /**
   * The actions column of the positions tables, for now holding only the reorder button. The
   * button appears on the facility rows and launches reordering scoped to the row's facility
   * (like the facility variant), even in the global admin variant.
   */
  const positionActionsColumn = ({facilityMode}: {facilityMode: boolean}): PartialColumnConfig => {
    const positionReorderModal = createPositionReorderModal();
    return {
      name: "actions",
      isDataColumn: false,
      extraDataColumns: ["id", "dictionary.id", "isFixed", "facility.id"],
      columnDef: {
        cell: (c) => {
          const row = () => c.row.original;
          const canReorder = () => !row().isFixed && row()["facility.id"] != null;
          return (
            <PaddedCell>
              <Show when={canReorder()}>
                <Button
                  class="minimal -my-px"
                  title={t("actions.reorder")}
                  onClick={() =>
                    positionReorderModal.show({
                      dictionaryId: row()["dictionary.id"] as string,
                      facilityMode,
                      scopeFacilityId: facilityMode ? undefined : (row()["facility.id"] as string),
                      highlightPositionId: row().id as string,
                    })
                  }
                >
                  <actionIcons.Reorder class="inlineIcon" />
                </Button>
              </Show>
            </PaddedCell>
          );
        },
        enableSorting: false,
        enableHiding: false,
        ...AUTO_SIZE_COLUMN_DEFS,
      },
    };
  };

  /** @param dictionaryHref creates the link target for the dictionary of a dict-type attribute. */
  const attributeColumns = (dictionaryHref: (dictionaryId: string) => string) =>
    createTableColumnsSet({
      apiName: {
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
      type: {
        name: "type",
        extraDataColumns: ["dictionary.id", "dictionary.name"],
        columnGroups: true,
        columnDef: {
          cell: cellFunc<string>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.v}>
                {(v) => (
                  <Show when={v() === "dict" && (props.row["dictionary.id"] as string | null)} fallback={<>{v()}</>}>
                    {(dictionaryId) => (
                      <>
                        dict: <A href={dictionaryHref(dictionaryId())}>{props.row["dictionary.name"] as string}</A>
                      </>
                    )}
                  </Show>
                )}
              </ShowCellVal>
            </PaddedCell>
          )),
        },
      },
      description: {
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
      metadata: {
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
    });

  const dictionaryColumns = createTableColumnsSet({
    name: {
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
  });

  /** Cell displaying a position id value as the position's label. */
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

  /** Cell displaying a list of attribute ids as the attributes' api names. */
  const attributeIdsCell = cellFunc<readonly string[]>((props) => (
    <PaddedCell>
      <ShowCellVal v={props.v}>
        {(ids) => <ThingsList things={ids().map((id) => `${allAttributes()?.getById(id).apiName ?? id}`)} />}
      </ShowCellVal>
    </PaddedCell>
  ));

  /** The attribute columns of the dictionaries tables, showing the required position attributes as api names. */
  const dictionaryAttributeColumns: AttributeColumnsConfig = {
    attributeColumns: true,
    selection: {
      model: "dictionary",
      includeFixed: true,
      fixedOverrides: {
        "positionRequiredAttributeIds": {columnDef: {cell: attributeIdsCell, size: 250}},
        "positionRequiredAttributeIds.count": false,
      },
    },
  };

  /**
   * The dynamic columns of a dictionary's positions table: one column per position attribute
   * of the dictionary, plus the position group column. Dict-type columns display position
   * labels; their filters use a facility-scoped position dropdown, so they should be enabled
   * only on tables scoped to the active facility.
   */
  const dictionaryPositionColumns = ({
    dictionaryId,
    dictFiltersEnabled,
  }: {
    dictionaryId: Accessor<string>;
    dictFiltersEnabled: boolean;
  }) => {
    const dictColumnDef = dictFiltersEnabled
      ? {cell: positionLabelCell}
      : {cell: positionLabelCell, enableColumnFilter: false};
    const positionColumns = createMemo((): PartialColumnConfig[] => {
      const dictionary = allDictionaries()?.get(dictionaryId());
      const attributes = allAttributes();
      const attributeColumns =
        dictionary && attributes
          ? (dictionary.resource.positionRequiredAttributeIds ?? [])
              .map((id) => attributes.getById(id))
              .filter((attribute) => !attribute.resource.facilityId)
              .sort((a, b) => a.resource.defaultOrder - b.resource.defaultOrder)
              .map((attribute) => ({
                name: `position.${attribute.apiName}`,
                ...(attribute.type === "dict" ? {columnDef: dictColumnDef} : {}),
              }))
          : [];
      return [...attributeColumns, {name: "position.positionGroupDictId", columnDef: dictColumnDef}];
    });
    return positionColumns;
  };

  return {
    attributeColumns,
    attributeActionsColumn,
    dictionaryColumns,
    dictionaryActionsColumn,
    dictionaryAttributeColumns,
    dictionaryPositionColumns,
    positionActionsColumn,
  };
}
