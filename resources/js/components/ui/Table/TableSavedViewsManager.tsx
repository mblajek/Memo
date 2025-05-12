import {Column} from "@tanstack/table-core";
import {createPersistence} from "components/persistence/persistence";
import {richJSONSerialiser, RichJSONValue, Serialiser} from "components/persistence/serialiser";
import {userStorageStorage} from "components/persistence/storage";
import {Capitalize} from "components/ui/Capitalize";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {createConfirmation} from "components/ui/confirmation";
import {CopyToClipboard} from "components/ui/CopyToClipboard";
import {useDocsModalInfoIcon} from "components/ui/docs_modal";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {HideableSection} from "components/ui/HideableSection";
import {actionIcons} from "components/ui/icons";
import {MODAL_STYLE_PRESETS} from "components/ui/Modal";
import {scrollIntoView} from "components/ui/scroll_into_view";
import {SearchInput} from "components/ui/SearchInput";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {SplitButton} from "components/ui/SplitButton";
import {ColumnName} from "components/ui/Table/ColumnName";
import {
  PartName,
  TABLE_SAVED_VIEW_PARTS,
  useTableSavedViewIndicators,
} from "components/ui/Table/table_saved_view_indicators";
import {
  getStencilledTableView,
  getTableViewFullSummary,
  getTableViewModifiesSummary,
  isPartialTableViewSummary,
  TableView,
  tableViewsSerialisation,
} from "components/ui/Table/table_views";
import {useTable} from "components/ui/Table/TableContext";
import {TextInput} from "components/ui/TextInput";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {Autofocus} from "components/utils/Autofocus";
import {cx} from "components/utils/classnames";
import {delayedAccessor} from "components/utils/debounce";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {createTextFilter} from "components/utils/text_util";
import {DataItem} from "data-access/memo-api/tquery/types";
import {IconTypes} from "solid-icons";
import {VsSave} from "solid-icons/vs";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  getOwner,
  Index,
  JSX,
  on,
  runWithOwner,
  Show,
  splitProps,
  untrack,
  VoidComponent,
} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Button, ButtonProps} from "../Button";
import {PopOver, PopOverControl} from "../PopOver";

type _Directives = typeof scrollIntoView | typeof title;

interface Props {
  readonly staticPersistenceKey: string;
  readonly defaultTableView?: TableView;
  readonly getCurrentView: () => TableView;
  readonly onLoad: (view: TableView) => void;
}

interface StoragePersistedState {
  readonly states: readonly NamedTableView[];
}

type SettingsPersistedState = {
  /** Advanced view. */
  readonly adv: boolean;
};

interface NamedTableView {
  readonly default?: boolean;
  readonly name: string;
  readonly state: TableView;
}

function stateSerialiser(): Serialiser<StoragePersistedState> {
  type SerialisedPersistedState = {
    readonly st: readonly SerialisedNamedTableView[];
  };
  type SerialisedNamedTableView = {
    readonly n: string;
    readonly s: RichJSONValue;
  };
  const intermediateSerialiser = tableViewsSerialisation.intermediateSerialiser();
  const jsonSerialiser = richJSONSerialiser<SerialisedPersistedState>();
  return {
    serialise(state) {
      return jsonSerialiser.serialise({
        st: state.states.map((st) => ({n: st.name, s: intermediateSerialiser.serialise(st.state)})),
      });
    },
    deserialise(value): StoragePersistedState {
      const deserialised = jsonSerialiser.deserialise(value);
      return {
        states: deserialised.st.map((st) => ({name: st.n, state: intermediateSerialiser.deserialise(st.s)})),
      };
    },
  };
}

export const TableSavedViewsManager: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {DocsModalInfoIcon} = useDocsModalInfoIcon();
  const owner = getOwner();
  const table = useTable();
  const translations = table.options.meta?.translations;
  const confirmation = createConfirmation();
  const indicators = useTableSavedViewIndicators();
  const codeSerialiser = tableViewsSerialisation.codeSerialiser();
  const [persistedState, setPersistedState] = createSignal<StoragePersistedState>({states: []});
  createPersistence<StoragePersistedState>({
    value: persistedState,
    onLoad: (state) => setPersistedState(state),
    serialiser: stateSerialiser(),
    storage: userStorageStorage(`table.saves.${props.staticPersistenceKey}`),
  });
  const [advancedView, setAdvancedView] = createSignal(false);
  createPersistence<SettingsPersistedState>({
    value: () => ({
      adv: advancedView(),
    }),
    onLoad: (state) => {
      setAdvancedView(state.adv);
    },
    storage: userStorageStorage("settings:table.saves"),
    version: [1],
  });
  function columnSupports(column: Column<DataItem>) {
    const includeInTableView = column.columnDef.meta?.config?.includeInTableView;
    return {
      visibility: includeInTableView?.visibility && column.getCanHide(),
      filter: includeInTableView?.filter && column.getCanFilter(),
    };
  }
  const allColumns = createMemo(() =>
    table.getAllLeafColumns().filter((col) => {
      const support = columnSupports(col);
      return support.visibility || support.filter;
    }),
  );

  const Contents: VoidComponent<{popOver: PopOverControl}> = (cProps) => {
    const currentView = createMemo(() => props.getCurrentView());
    const currentViewSummary = createMemo(() => getTableViewFullSummary({newView: currentView()}));
    const [getNewName, setNewName] = createSignal("");
    const newName = () => getNewName().trim();
    const newNameConflict = () => persistedState().states.some((st) => st.name === newName());
    // eslint-disable-next-line solid/reactivity
    const [currentInputView, setCurrentInputView] = createSignal(currentView());
    createEffect(() => {
      if (!advancedView()) {
        setCurrentInputView(currentView());
      }
    });
    const currentInputViewSummary = createMemo(() => getTableViewFullSummary({newView: currentInputView()}));
    const [currentInputViewCode, setCurrentInputViewCode] = createSignal("");
    createEffect(() =>
      codeSerialiser
        .serialise({tableId: props.staticPersistenceKey, viewName: newName(), view: currentInputView()})
        .then((code) => setCurrentInputViewCode(code)),
    );
    const namedCurrentInputView = (): NamedTableView => ({name: newName(), state: currentInputView()});

    let mountPoint: HTMLDivElement | undefined;

    async function editView(oldView: NamedTableView, mode: "create" | "edit" | "editCurrent") {
      // eslint-disable-next-line solid/reactivity
      return await runWithOwner(owner, async () => {
        const hasName = mode === "edit" || mode === "create";
        const [getNewName, setNewName] = createSignal(oldView.name);
        const newName = () => getNewName().trim();
        const [newViewState, setNewViewState] = createSignal({...oldView.state});
        const oldViewSummary = getTableViewFullSummary({newView: oldView.state});
        const newViewSummary = createMemo(() => getTableViewFullSummary({newView: newViewState()}));
        const newNameConflict = createMemo(() => {
          const conflict = persistedState().states.some((st) => st.name === newName());
          return mode === "edit" ? conflict && newName() !== oldView.name : conflict;
        });
        // eslint-disable-next-line solid/reactivity
        const delayedNewNameConflict = delayedAccessor(newNameConflict, {outputImmediately: (c) => !c});
        function fieldName(field: string) {
          return t([`models.table_saved_view.${field}`, `models.generic.${field}`]);
        }
        const confirmed = await confirmation.confirm({
          title: t(
            mode === "edit"
              ? "forms.table_saved_view_edit.form_name"
              : mode === "create"
                ? "forms.table_saved_view_create.form_name"
                : mode === "editCurrent"
                  ? "tables.saved_views.edit_current.form_name"
                  : (mode satisfies never),
          ),
          body: (controller) => (
            <Autofocus>
              <div class="flex flex-col gap-3 mb-3">
                <Show when={hasName}>
                  <div class="flex flex-col">
                    <div class="flex justify-between gap-1">
                      <StandaloneFieldLabel>
                        <Capitalize text={fieldName("name")} />
                      </StandaloneFieldLabel>
                      <Show when={advancedView()}>
                        <indicators.Indicator viewSummary={newViewSummary()} />
                      </Show>
                    </div>
                    <TextInput
                      class="min-h-big-input px-2"
                      autofocus
                      value={getNewName()}
                      onInput={({target: {value}}) => setNewName(value)}
                      onFocus={({target}) => target.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          controller.resolve(true);
                        }
                      }}
                    />
                    <HideableSection show={delayedNewNameConflict()}>
                      <div class="text-red-600">{t("tables.saved_views.rename_conflict")}</div>
                    </HideableSection>
                  </div>
                </Show>
                <Show when={advancedView()}>
                  {(_) => {
                    const SingleSel: VoidComponent<{readonly staticPartName: PartName}> = (selProps) => {
                      const partName = selProps.staticPartName;
                      return (
                        <>
                          <div class="col-start-1 flex items-center">
                            <indicators.Icon staticPartName={partName} viewSummary={newViewSummary()} />
                          </div>
                          <div class="flex items-center">
                            <Capitalize text={t(`models.table_saved_view.${partName}`)} />
                          </div>
                          <SegmentedControl
                            name="globalFilter"
                            label=""
                            items={[
                              {value: "ignore", label: () => t("tables.saved_views.component_actions.ignore")},
                              {
                                value: "modify",
                                label: () =>
                                  t(
                                    (newViewSummary().modifiesSummary[partName]
                                      ? newViewSummary()
                                      : oldViewSummary.modifiesSummary[partName]
                                        ? oldViewSummary
                                        : currentViewSummary()
                                    ).modifiesClearedSummary[partName]
                                      ? "tables.saved_views.component_actions.set"
                                      : "tables.saved_views.component_actions.clear",
                                  ),
                              },
                            ]}
                            value={newViewSummary().modifiesSummary[partName] ? "modify" : "ignore"}
                            onValueChange={(value) =>
                              setNewViewState((s) => ({
                                ...s,
                                [partName]:
                                  value === "modify"
                                    ? oldViewSummary.modifiesSummary[partName]
                                      ? oldView.state[partName]
                                      : currentView()[partName]
                                    : undefined,
                              }))
                            }
                            small
                          />
                        </>
                      );
                    };
                    function isColumnFilterAvailable(column: string) {
                      return oldView.state.columnFilters?.get(column) || currentView().columnFilters?.get(column);
                    }
                    const ColumnsRowSel: VoidComponent<{readonly column: Column<DataItem>}> = (colProps) => {
                      const supports = createMemo(() => columnSupports(colProps.column));
                      const visibilityMap = {
                        "-": undefined,
                        "true": true,
                        "false": false,
                      };
                      const filterValue = () => {
                        const {columnFilters} = newViewState();
                        if (!columnFilters?.has(colProps.column.id)) {
                          return "-";
                        }
                        return columnFilters.get(colProps.column.id) ? "set" : "clear";
                      };
                      const isColumnFilterSetDisabled = createMemo(() => !isColumnFilterAvailable(colProps.column.id));
                      return (
                        <div class="contents group">
                          <div
                            class="col-start-1 px-1 flex flex-col justify-center pe-1 group-hover:bg-hover"
                            style={{"line-height": "1.1"}}
                          >
                            <ColumnName def={colProps.column} />
                          </div>
                          <div class="flex flex-col justify-center pe-1 group-hover:bg-hover">
                            <Show when={supports().visibility} fallback={<EmptyValueSymbol class="text-center" />}>
                              <SegmentedControl
                                name="columnVisibility"
                                label=""
                                items={[
                                  {value: "-", label: () => t("tables.saved_views.component_actions.ignore")},
                                  {value: "false", label: () => t("tables.saved_views.component_actions.hide")},
                                  {value: "true", label: () => t("tables.saved_views.component_actions.show")},
                                ]}
                                value={String(newViewState().columnVisibility?.[colProps.column.id] ?? "-")}
                                onValueChange={(value) =>
                                  setNewViewState((s) => {
                                    const columnVisibility = {...s.columnVisibility};
                                    let columnFilters = s.columnFilters;
                                    const newVis = visibilityMap[value as keyof typeof visibilityMap];
                                    if (newVis === undefined) {
                                      delete columnVisibility[colProps.column.id];
                                    } else {
                                      columnVisibility[colProps.column.id] = newVis;
                                      if (!newVis && columnFilters?.get(colProps.column.id) && supports().filter) {
                                        // Hiding column forces a filter change, so remove a filter set.
                                        const colFilters = new Map(columnFilters);
                                        colFilters.delete(colProps.column.id);
                                        columnFilters = colFilters;
                                      }
                                    }
                                    return {...s, columnVisibility, columnFilters};
                                  })
                                }
                                small
                              />
                            </Show>
                          </div>
                          <div class="flex flex-col justify-center pe-1 group-hover:bg-hover">
                            <Show when={supports().filter} fallback={<EmptyValueSymbol class="text-center" />}>
                              <SegmentedControl
                                name="columnFilters"
                                label=""
                                items={[
                                  {value: "-", label: () => t("tables.saved_views.component_actions.ignore")},
                                  {value: "clear", label: () => t("tables.saved_views.component_actions.clear")},
                                  {
                                    value: "set",
                                    label: () => (
                                      <div
                                        use:title={
                                          isColumnFilterSetDisabled()
                                            ? t("tables.saved_views.no_column_filter_to_set")
                                            : undefined
                                        }
                                      >
                                        {t("tables.saved_views.component_actions.set")}
                                      </div>
                                    ),
                                    disabled: isColumnFilterSetDisabled(),
                                  },
                                ]}
                                value={filterValue()}
                                onValueChange={(value) =>
                                  setNewViewState((s) => {
                                    const columnFilters = new Map(s.columnFilters);
                                    let columnVisibility = s.columnVisibility;
                                    if (value === "-") {
                                      columnFilters.delete(colProps.column.id);
                                    } else if (value === "clear") {
                                      columnFilters.set(colProps.column.id, undefined);
                                    } else if (value === "set") {
                                      columnFilters.set(
                                        colProps.column.id,
                                        oldView.state.columnFilters?.get(colProps.column.id) ||
                                          currentView().columnFilters?.get(colProps.column.id),
                                      );
                                      // Setting the filter forces the column to be shown, so remove the column hiding.
                                      if (columnVisibility?.[colProps.column.id] === false && supports().visibility) {
                                        const colVisibility = {...columnVisibility};
                                        delete colVisibility[colProps.column.id];
                                        columnVisibility = colVisibility;
                                      }
                                    } else {
                                      throw new Error(`Unexpected value: ${value}`);
                                    }
                                    return {...s, columnFilters, columnVisibility};
                                  })
                                }
                                small
                              />
                            </Show>
                          </div>
                        </div>
                      );
                    };
                    const [search, setSearch] = createSignal("");
                    const matchingColumns = createMemo(() => {
                      const columnsTop: Column<DataItem>[] = [];
                      const columnsBottom: Column<DataItem>[] = [];
                      const searchFilter = createTextFilter(search());
                      for (const col of allColumns()) {
                        if (searchFilter && translations && !searchFilter(translations.columnName(col.id))) {
                          continue;
                        }
                        const supports = columnSupports(col);
                        if (!supports.visibility && !supports.filter) {
                          continue;
                        }
                        const isFilterAvailable = isColumnFilterAvailable(col.id);
                        if (isFilterAvailable) {
                          columnsTop.push(col);
                        }
                        if (!isFilterAvailable || !searchFilter) {
                          columnsBottom.push(col);
                        }
                      }
                      const columns: (Column<DataItem> | "sep")[] = [...columnsTop];
                      if (columnsTop.length && columnsBottom.length) {
                        columns.push("sep");
                      }
                      return [...columns, ...columnsBottom];
                    });
                    return (
                      <>
                        <div
                          class="grid gap-x-3 gap-y-1 me-auto align-baseline"
                          style={{"grid-template-columns": "auto auto auto 1fr"}}
                        >
                          <For each={TABLE_SAVED_VIEW_PARTS}>{(part) => <SingleSel staticPartName={part} />}</For>
                        </div>
                        <Button
                          class="secondary small"
                          onClick={[setNewViewState, {}]}
                          disabled={!newViewSummary().modifiesSummary.any}
                        >
                          {t("tables.saved_views.component_actions.all.ignore")}
                        </Button>
                        <div class="flex flex-col gap-1">
                          <div class="flex items-center">
                            <actionIcons.Search class="px-0.5" size="24" />
                            <SearchInput
                              divClass="grow"
                              placeholder={t("tables.columns_search.placeholder")}
                              value={search()}
                              onValueChange={setSearch}
                            />
                          </div>
                          <div class="h-60 border border-1 border-gray-400 rounded">
                            <Show
                              when={matchingColumns().length}
                              fallback={<div class="px-1 text-grey-text">{t("tables.columns_search.no_results")}</div>}
                            >
                              <div
                                class="max-h-full grid"
                                style={{
                                  "grid-template-columns": "1fr auto auto var(--sb-size)",
                                  "grid-template-rows": "auto 1fr",
                                }}
                              >
                                <div class="col-span-full grid grid-cols-subgrid">
                                  <div />
                                  <div class="text-center font-semibold">
                                    <Capitalize text={t("models.table_saved_view.columnVisibility")} />
                                  </div>
                                  <div class="text-center font-semibold">
                                    <Capitalize text={t("models.table_saved_view.columnFilters")} />
                                  </div>
                                </div>
                                <div class="col-span-full overflow-x-clip overflow-y-auto grid grid-cols-subgrid">
                                  <div class="col-span-3 grid grid-cols-subgrid gap-y-1 mb-1">
                                    <For each={matchingColumns()}>
                                      {(col) => (
                                        <Show
                                          when={col !== "sep" && col}
                                          fallback={<hr class="col-span-full mx-2 border-gray-400" />}
                                        >
                                          {(col) => <ColumnsRowSel column={col()} />}
                                        </Show>
                                      )}
                                    </For>
                                  </div>
                                </div>
                              </div>
                            </Show>
                          </div>
                          <div class="text-grey-text">{t("tables.saved_views.action_ignore_explanation")}</div>
                        </div>
                      </>
                    );
                  }}
                </Show>
              </div>
            </Autofocus>
          ),
          confirmText: t(
            mode === "edit"
              ? "forms.table_saved_view_edit.submit"
              : mode === "create"
                ? "forms.table_saved_view_create.submit"
                : mode === "editCurrent"
                  ? "tables.saved_views.edit_current.submit"
                  : (mode satisfies never),
          ),
          confirmDisabled: () =>
            (hasName && (!newName() || newNameConflict())) || !newViewSummary().modifiesSummary.any,
          modalStyle: advancedView() ? MODAL_STYLE_PRESETS.medium : undefined,
          mountPoint,
        });
        if (confirmed) {
          // eslint-disable-next-line solid/reactivity
          const theNewView: NamedTableView = {name: newName(), state: newViewState()};
          if (mode === "editCurrent") {
            setCurrentInputView(theNewView.state);
          } else {
            setPersistedState((s) => ({
              ...s,
              states:
                mode === "edit"
                  ? [...s.states.map((st) => (st.name === oldView.name ? theNewView : st))]
                  : [...s.states, theNewView],
            }));
          }
        }
      });
    }

    async function confirmAndDelete(view: NamedTableView) {
      const summary = getTableViewFullSummary({newView: view.state});
      if (
        await confirmation.confirm({
          title: t("forms.table_saved_view_delete.form_name"),
          body: () => (
            <div class="flex flex-col gap-1 mb-1">
              <div>{t("forms.table_saved_view_delete.confirmation_text")}</div>
              <div class="px-1 flex gap-2 justify-between rounded border border-gray-300">
                {view.name}
                <Show when={advancedView() || isPartialTableViewSummary(summary.modifiesSummary)}>
                  <indicators.Indicator
                    viewSummary={summary}
                    title={[<indicators.Explanation viewSummary={summary} />, {placement: "right"}]}
                  />
                </Show>
              </div>
            </div>
          ),
          mountPoint,
        })
      ) {
        setPersistedState((s) => ({
          ...s,
          states: s.states.filter((st) => st.name !== view.name),
        }));
      }
    }

    let container: HTMLDivElement | undefined;
    const [inputCode, setInputCode] = createSignal("");
    const [codeErrorMessage, setCodeErrorMessage] = createSignal<string>();
    createEffect(on(currentInputViewCode, (currentInputViewCode) => setInputCode(currentInputViewCode)));
    createEffect(() => {
      const code = inputCode().trim();
      if (code && code !== currentInputViewCode()) {
        const codeParts = code.split(/[,;\s]+/);
        Promise.all(codeParts.map((codePart) => codeSerialiser.deserialise(codePart))).then(
          (deserialisedParts) =>
            runWithOwner(owner, () =>
              untrack(() => {
                if (deserialisedParts.length === 1) {
                  const {tableId, viewName, view} = deserialisedParts[0]!;
                  if (tableId && tableId !== props.staticPersistenceKey) {
                    setCodeErrorMessage(t("tables.saved_views.code_error.different_table"));
                    return;
                  }
                  if (viewName) {
                    setNewName(viewName);
                  }
                  props.onLoad(view);
                  if (advancedView()) {
                    setCurrentInputView(view);
                  }
                } else {
                  for (let i = 0; i < deserialisedParts.length; i++) {
                    const {tableId, viewName} = deserialisedParts[i]!;
                    if (tableId && tableId !== props.staticPersistenceKey) {
                      setCodeErrorMessage(t("tables.saved_views.code_error.multiple.different_table", {index: i + 1}));
                      return;
                    }
                    if (!viewName) {
                      setCodeErrorMessage(t("tables.saved_views.code_error.multiple.no_view_name", {index: i + 1}));
                      return;
                    }
                  }
                  deserialisedParts.sort((a, b) => a.viewName!.localeCompare(b.viewName!));
                  const deserialisedPartsMap = new Map<string, NamedTableView>();
                  for (let i = 0; i < deserialisedParts.length; i++) {
                    const {viewName, view} = deserialisedParts[i]!;
                    if (deserialisedPartsMap.has(viewName!)) {
                      setCodeErrorMessage(
                        t("tables.saved_views.code_error.multiple.duplicate_view_name", {
                          index1: deserialisedParts.findIndex((p) => p.viewName === viewName) + 1,
                          index2: i + 1,
                          viewName,
                        }),
                      );
                      return;
                    }
                    deserialisedPartsMap.set(viewName!, {name: viewName!, state: view});
                  }
                  const [getIncluded, setIncluded] = createSignal<ReadonlyMap<string, boolean>>(new Map());
                  function isIncluded(viewName: string) {
                    return getIncluded().get(viewName) ?? true;
                  }
                  const selectedPartsMap = createMemo(
                    () => new Map([...deserialisedPartsMap.entries()].filter(([viewName]) => isIncluded(viewName))),
                  );
                  void confirmation
                    .confirm({
                      title: t("tables.saved_views.code_multiple_confirmation.title"),
                      body: () => (
                        <div class="mb-2">
                          <div>{t("tables.saved_views.code_multiple_confirmation.desc")}</div>
                          <div class="flex flex-col gap-1">
                            <For each={[...deserialisedPartsMap.values()]}>
                              {(view) => {
                                const summary = getTableViewFullSummary({newView: view.state});
                                const overwrites = createMemo(() =>
                                  persistedState().states.some((st) => st.name === view.name),
                                );
                                return (
                                  <div class="flex items-center gap-1">
                                    <CheckboxInput
                                      checked={isIncluded(view.name)}
                                      onChecked={(checked) => setIncluded((i) => new Map(i).set(view.name, checked))}
                                    />
                                    <div
                                      class={cx(
                                        "flex-grow px-1 flex gap-2 justify-between rounded border border-gray-300",
                                        isIncluded(view.name) ? undefined : "text-gray-400",
                                      )}
                                    >
                                      <div
                                        use:title={
                                          overwrites()
                                            ? t("tables.saved_views.code_multiple_confirmation.conflict")
                                            : undefined
                                        }
                                      >
                                        {view.name}
                                        <Show when={overwrites()}>
                                          <WarningMark class={isIncluded(view.name) ? undefined : "text-opacity-40"} />
                                        </Show>
                                      </div>
                                      <Show when={advancedView() || isPartialTableViewSummary(summary.modifiesSummary)}>
                                        <indicators.Indicator
                                          viewSummary={summary}
                                          title={[
                                            <indicators.Explanation viewSummary={summary} />,
                                            {placement: "right"},
                                          ]}
                                        />
                                      </Show>
                                    </div>
                                  </div>
                                );
                              }}
                            </For>
                          </div>
                        </div>
                      ),
                      confirmText: t("tables.saved_views.code_multiple_confirmation.confirm"),
                      confirmDisabled: () => !selectedPartsMap().size,
                      mountPoint,
                    })
                    .then((confirmed) =>
                      // eslint-disable-next-line solid/reactivity
                      runWithOwner(owner, () => {
                        if (confirmed) {
                          setPersistedState((s) => ({
                            ...s,
                            states: [
                              ...s.states.filter((st) => !selectedPartsMap().has(st.name)),
                              ...selectedPartsMap().values(),
                            ],
                          }));
                        }
                      }),
                    )
                    .finally(() =>
                      // eslint-disable-next-line solid/reactivity
                      runWithOwner(owner, () => {
                        setInputCode(currentInputViewCode());
                      }),
                    );
                }
                setCodeErrorMessage(undefined);
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }),
            ),
          () => setCodeErrorMessage(t("tables.saved_views.code_error.invalid")),
        );
      } else {
        setCodeErrorMessage(undefined);
      }
    });

    const statesToShow = () => [
      ...(props.defaultTableView
        ? [{default: true, name: t("tables.saved_views.default_view_name"), state: props.defaultTableView}]
        : []),
      ...persistedState().states.toSorted((a, b) => a.name.localeCompare(b.name)),
    ];

    return (
      <>
        <div ref={container} class="p-2 flex flex-col gap-3 items-stretch min-h-0">
          <div class="flex gap-2 items-baseline justify-between">
            <div class="font-bold">
              {t("tables.saved_views.title")}{" "}
              <DocsModalInfoIcon href="/help/table-saved-views" onClick={() => cProps.popOver.close()} />
            </div>
            <CheckboxInput
              labelBefore={
                <span class="font-normal text-xs">{t("tables.saved_views.advanced_view.abbreviation")} </span>
              }
              title={t("tables.saved_views.advanced_view")}
              checked={advancedView()}
              onChecked={setAdvancedView}
            />
          </div>
          <div class="grow overflow-y-auto -me-2">
            <div class="me-2 max-w-md grid gap-1" style={{"grid-template-columns": "1fr auto"}}>
              <Index each={statesToShow()} fallback={<EmptyValueSymbol />}>
                {(state) => {
                  const summary = createMemo(() =>
                    getTableViewFullSummary({baseView: currentView(), newView: state().state}),
                  );
                  return (
                    <>
                      <div class="col-start-1" use:scrollIntoView={state().name === newName()}>
                        <Button
                          data-view-name={state().name}
                          class={cx(
                            "w-full minimal !px-1 text-start outline outline-0 outline-memo-active flex flex-wrap justify-between gap-x-2",
                            summary().modifiesBaseSummary?.any ? undefined : "!bg-select",
                            state().default ? "text-grey-text" : undefined,
                          )}
                          title={[
                            <div class="flex flex-col gap-1">
                              <div>
                                {summary().modifiesBaseSummary?.any
                                  ? t("tables.saved_views.load_hint")
                                  : t("tables.saved_views.load_hint_no_change")}
                              </div>
                              <Show when={advancedView() || isPartialTableViewSummary(summary().modifiesSummary)}>
                                <indicators.Explanation viewSummary={summary()} />
                              </Show>
                            </div>,
                            {placement: "left", offset: [0, 4], delay: [600, undefined]},
                          ]}
                          onClick={() => {
                            const any = summary().modifiesBaseSummary?.any;
                            props.onLoad(state().state);
                            if (any) {
                              cProps.popOver.close();
                            }
                          }}
                        >
                          <div>
                            {state().name}
                            <Show when={state().name === newName()}>
                              <span use:title={t("tables.saved_views.save_hint_conflict")}>
                                <WarningMark />
                              </span>
                            </Show>
                          </div>
                          <Show when={advancedView() || isPartialTableViewSummary(summary().modifiesSummary)}>
                            <indicators.Indicator class="ms-auto" viewSummary={summary()} />
                          </Show>
                        </Button>
                      </div>
                      <Show when={!state().default}>
                        <PopOver
                          trigger={(popOver) => (
                            <Button
                              class={cx(
                                "rounded border px-1",
                                popOver.isOpen ? "border border-input-border" : "border-transparent",
                              )}
                              onClick={popOver.open}
                            >
                              <actionIcons.ThreeDots />
                            </Button>
                          )}
                          parentPopOver={cProps.popOver}
                        >
                          {(optionsPopOver) => {
                            const MenuItem: VoidComponent<ButtonProps & {icon: IconTypes; label: JSX.Element}> = (
                              allProps,
                            ) => {
                              const [props, buttonProps] = splitProps(allProps, ["icon", "label"]);
                              return (
                                <Button {...htmlAttributes.merge(buttonProps, {class: "flex items-center gap-2"})}>
                                  <Dynamic component={props.icon} size="18" />
                                  {props.label}
                                </Button>
                              );
                            };
                            return (
                              <SimpleMenu onClick={optionsPopOver.close}>
                                <MenuItem
                                  icon={VsSave}
                                  label={t("tables.saved_views.overwrite_with_current")}
                                  onClick={() => {
                                    const stencilledState = getStencilledTableView({
                                      view: currentInputView(),
                                      stencil: state().state,
                                    });
                                    const stencilledStateSummary = getTableViewModifiesSummary(stencilledState);
                                    const newState = stencilledStateSummary.any ? stencilledState : currentInputView();
                                    setPersistedState((s) => ({
                                      ...s,
                                      states: s.states.map((st) =>
                                        st.name === state().name ? {...st, state: newState} : st,
                                      ),
                                    }));
                                  }}
                                />
                                <MenuItem
                                  icon={actionIcons.Copy}
                                  label={t("tables.saved_views.copy_code")}
                                  onClick={() =>
                                    void codeSerialiser
                                      .serialise({
                                        tableId: props.staticPersistenceKey,
                                        viewName: state().name,
                                        view: state().state,
                                      })
                                      .then((code) => navigator.clipboard.writeText(code))
                                  }
                                />
                                <MenuItem
                                  icon={advancedView() ? actionIcons.Edit : actionIcons.Rename}
                                  label={t(advancedView() ? "actions.edit" : "actions.rename")}
                                  onClick={() => void editView(state(), "edit")}
                                />
                                <MenuItem
                                  icon={actionIcons.Duplicate}
                                  label={t("actions.duplicate")}
                                  onClick={() => {
                                    const suffixMatch = state().name.match(/(.+) \((\d+)\)$/);
                                    const base = suffixMatch?.[1] || state().name;
                                    let suffix = suffixMatch ? Number(suffixMatch[2]) + 1 : 1;
                                    let newName = "";
                                    for (;;) {
                                      newName = `${base} (${suffix})`;
                                      if (!persistedState().states.some((st) => st.name === newName)) {
                                        break;
                                      }
                                      suffix++;
                                    }
                                    void editView({...state(), name: newName}, "create");
                                  }}
                                />
                                <MenuItem
                                  icon={actionIcons.Delete}
                                  label={t("actions.delete")}
                                  onClick={() => void confirmAndDelete(state())}
                                />
                              </SimpleMenu>
                            );
                          }}
                        </PopOver>
                      </Show>
                    </>
                  );
                }}
              </Index>
            </div>
          </div>
          <div class="max-w-md grid gap-x-1" style={{"grid-template-columns": "1fr min(6rem)"}}>
            <SearchInput
              placeholder={t("tables.saved_views.new_placeholder")}
              value={newName()}
              onValueChange={setNewName}
              clearButton={false}
            />
            <SplitButton
              class="secondary small"
              onClick={() => {
                if (!newName() || newNameConflict()) {
                  void editView(namedCurrentInputView(), "create").then(() => setNewName(""));
                } else {
                  setPersistedState((s) => ({
                    ...s,
                    states: [...s.states, namedCurrentInputView()],
                  }));
                  setNewName("");
                }
              }}
              popOver={
                advancedView()
                  ? (popOver) => (
                      <SimpleMenu>
                        <Button
                          onClick={() => {
                            popOver.close();
                            void editView(namedCurrentInputView(), "editCurrent").then(() => setNewName(""));
                          }}
                        >
                          {t("tables.saved_views.edit")}
                        </Button>
                        <Button
                          onClick={() => {
                            popOver.close();
                            void editView(namedCurrentInputView(), "create").then(() => setNewName(""));
                          }}
                        >
                          {t("tables.saved_views.edit_and_save")}
                        </Button>
                      </SimpleMenu>
                    )
                  : undefined
              }
              title={t("tables.saved_views.save_hint")}
              parentPopOver={cProps.popOver}
            >
              {t("actions.save")}
            </SplitButton>
            <Show when={advancedView()}>
              <div class="col-span-full flex justify-end">
                <indicators.Indicator
                  viewSummary={currentInputViewSummary()}
                  title={[
                    <div class="flex flex-col gap-1">
                      <div>{t("tables.saved_views.current_view_header")}</div>
                      <indicators.Explanation viewSummary={currentInputViewSummary()} />
                    </div>,
                    {placement: "bottom"},
                  ]}
                />
              </div>
            </Show>
            <div class="col-start-1 h-2" />
            <div class="col-start-1 flex gap-4 items-center justify-between">
              <div class="flex items-center gap-1">
                <StandaloneFieldLabel>{t("tables.saved_views.current_view_code")}</StandaloneFieldLabel>{" "}
                <DocsModalInfoIcon
                  href="/help/table-saved-views-codes.part"
                  fullPageHref="/help/table-saved-views#codes"
                  onClick={() => cProps.popOver.close()}
                />
              </div>
              <CopyToClipboard text={currentInputViewCode()} showDisabledOnEmpty />
            </div>
            <TextInput
              class="grow w-full min-h-small-input px-1 font-mono text-xs"
              aria-invalid={!!codeErrorMessage()}
              value={inputCode()}
              onFocus={({target}) => target.select()}
              onInput={({target}) => setInputCode(target.value)}
              // onFocusOut={() => {
              //   if (!advancedView() || codeErrorMessage()) {
              //     setInputCode(currentInputViewCode());
              //   }
              //   setCodeErrorMessage(undefined);
              // }}
            />
            <HideableSection class="col-span-full" show={codeErrorMessage()}>
              <div class="text-red-600">{codeErrorMessage()}</div>
            </HideableSection>
          </div>
        </div>
        <div ref={mountPoint} />
      </>
    );
  };

  return (
    <PopOver
      trigger={(popOver) => (
        <Button
          class="rounded px-1 border border-input-border pressedWithShadow"
          onClick={popOver.open}
          title={t("tables.saved_views.hint")}
        >
          <actionIcons.SaveTableView size="18" />
        </Button>
      )}
    >
      {(popOver) => <Contents popOver={popOver} />}
    </PopOver>
  );
};
