import {createPersistence} from "components/persistence/persistence";
import {RichJSONValue, richJSONValuesEqual} from "components/persistence/serialiser";
import {userStorageStorage} from "components/persistence/storage";
import {createConfirmation} from "components/ui/confirmation";
import {useDocsModalInfoIcon} from "components/ui/docs_modal";
import {HideableSection} from "components/ui/HideableSection";
import {actionIcons} from "components/ui/icons";
import {scrollIntoView} from "components/ui/scroll_into_view";
import {SearchInput} from "components/ui/SearchInput";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {EmptyValueSymbol} from "components/ui/symbols";
import {ControlState} from "components/ui/Table/tquery_filters/types";
import {TextInput} from "components/ui/TextInput";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {cx, delayedAccessor, useLangFunc} from "components/utils";
import {Autofocus} from "components/utils/Autofocus";
import {arraysEqual, objectsEqual} from "components/utils/object_util";
import {ColumnView, TableView} from "data-access/memo-api/tquery/table";
import {ColumnName} from "data-access/memo-api/tquery/types";
import {VsSave} from "solid-icons/vs";
import {Accessor, createMemo, createSignal, For, Show, VoidComponent} from "solid-js";
import {Button} from "../Button";
import {PopOver, PopOverControl} from "../PopOver";
import {useTable} from "./TableContext";

type _Directives = typeof scrollIntoView | typeof title;

interface Props {
  readonly getCurrentView: () => TableView;
  readonly onLoad: (view: TableView) => void;
}

type PersistedState = {
  readonly st: readonly NamedTableView[];
};

type NamedTableView = {
  readonly n: string;
  readonly s: TableView;
};

const VERSION = [1];

export const TableSavedViewsManager: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const persistenceKey = table.options.meta?.tquery?.persistenceKey;
  if (!persistenceKey) {
    // eslint-disable-next-line solid/components-return-once
    return undefined;
  }
  const {DocsModalInfoIcon} = useDocsModalInfoIcon();
  const [persistedState, setPersistedState] = createSignal<PersistedState>({st: []});
  createPersistence<PersistedState & RichJSONValue>({
    value: persistedState as Accessor<PersistedState & RichJSONValue>,
    onLoad: (state) => setPersistedState(state),
    storage: userStorageStorage(`table.saves.${persistenceKey}`),
    version: VERSION,
  });
  const confirmation = createConfirmation();
  let savedPopOver: PopOverControl | undefined;

  async function confirmAndRename(oldName: string) {
    const [getNewName, setNewName] = createSignal(oldName);
    const newName = () => getNewName().trim();
    const newNameConflict = () => newName() !== oldName && persistedState().st.some((st) => st.n === newName());
    // eslint-disable-next-line solid/reactivity
    const delayedNewNameConflict = delayedAccessor(newNameConflict, {outputImmediately: (c) => !c});
    if (
      await confirmation.confirm({
        title: t("actions.rename"),
        body: (controller) => (
          <Autofocus>
            <div class="flex flex-col gap-1">
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
            </div>
            <HideableSection show={delayedNewNameConflict()}>
              <div>{t("tables.saved_views.rename_conflict")}</div>
            </HideableSection>
          </Autofocus>
        ),
        confirmText: t("actions.rename"),
        confirmDisabled: () => !newName() || newNameConflict(),
      })
    ) {
      // eslint-disable-next-line solid/reactivity
      const theNewName = newName();
      setPersistedState((s) => ({
        ...s,
        st: [...s.st.filter((s) => s.n !== oldName), {n: theNewName, s: props.getCurrentView()}],
      }));
      savedPopOver?.open();
    }
  }

  return (
    <PopOver
      trigger={(popOver) => (
        <Button
          class="rounded px-1 border border-input-border pressedWithShadow"
          onClick={popOver.open}
          title={t("tables.saved_views.hint")}
        >
          <VsSave size="18" />
        </Button>
      )}
    >
      {(popOver) => {
        savedPopOver = popOver;
        const currentView = createMemo(() => props.getCurrentView());
        const [getNewName, setNewName] = createSignal("");
        const newName = () => getNewName().trim();
        const newNameConflict = () => persistedState().st.some((st) => st.n === newName());
        return (
          <div
            class={cx(
              "p-2 pe-0 flex flex-col gap-2 items-stretch min-h-0",
              confirmation.isShown() ? "hidden" : undefined,
            )}
          >
            <div class="font-bold">
              {t("tables.saved_views.title")}{" "}
              <DocsModalInfoIcon href="/help/table-saved-views" onClick={() => popOver.close()} />
            </div>
            <div class="grow overflow-y-auto">
              <div class="flex flex-col items-stretch gap-1">
                <For
                  each={persistedState().st.toSorted((a, b) => a.n.localeCompare(b.n))}
                  fallback={<EmptyValueSymbol />}
                >
                  {(state) => {
                    const deltaSummary = createMemo(() => getViewDelta(currentView(), state.s).deltaSummary);
                    return (
                      <div class="flex items-stretch gap-2 me-2">
                        <div class="grow max-w-md" use:scrollIntoView={state.n === newName()}>
                          <Button
                            class={cx(
                              "w-full minimal !px-1 text-start",
                              deltaSummary().anything ? undefined : "!bg-select",
                            )}
                            title={[
                              deltaSummary().anything
                                ? t("tables.saved_views.load_hint")
                                : t("tables.saved_views.load_hint_no_change"),
                              {placement: "left", offset: [0, 4], delay: [1000, undefined]},
                            ]}
                            onClick={() => {
                              const {anything} = deltaSummary();
                              props.onLoad(state.s as TableView);
                              if (anything) {
                                popOver.close();
                              }
                            }}
                          >
                            {state.n}
                            <Show when={state.n === newName()}>
                              <span use:title={t("tables.saved_views.save_hint_conflict")}>
                                <WarningMark />
                              </span>
                            </Show>
                          </Button>
                        </div>
                        <PopOver
                          trigger={(popOver) => (
                            <Button
                              class={cx(
                                "rounded border",
                                popOver.isOpen ? "border border-input-border" : "border-transparent",
                              )}
                              onClick={popOver.open}
                            >
                              <actionIcons.ThreeDots />
                            </Button>
                          )}
                          parentPopOver={popOver}
                        >
                          <SimpleMenu>
                            <Button
                              onClick={() =>
                                setPersistedState((s) => ({
                                  ...s,
                                  st: s.st.map((st) => (st.n === state.n ? {...st, s: props.getCurrentView()} : st)),
                                }))
                              }
                            >
                              {t("tables.saved_views.overwrite_with_current")}
                            </Button>
                            <Button
                              onClick={() => {
                                popOver.close();
                                confirmAndRename(state.n);
                              }}
                            >
                              {t("actions.rename")}
                            </Button>
                            <Button
                              onClick={() =>
                                setPersistedState((s) => ({
                                  ...s,
                                  st: s.st.filter((st) => st.n !== state.n),
                                }))
                              }
                            >
                              {t("actions.delete")}
                            </Button>
                          </SimpleMenu>
                        </PopOver>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
            <div class="flex items-stretch gap-1 pe-2">
              <SearchInput
                divClass="grow"
                placeholder={t("tables.saved_views.new_placeholder")}
                value={newName()}
                onValueChange={setNewName}
                clearButton={false}
              />
              <Button
                class="secondary small min-w-32"
                disabled={!newName() || newNameConflict()}
                onClick={() => {
                  setPersistedState((s) => ({
                    ...s,
                    st: [...s.st, {n: newName(), s: props.getCurrentView()}],
                  }));
                  setNewName("");
                }}
                title={t("tables.saved_views.save_hint")}
              >
                {t("actions.save")}
              </Button>
            </div>
          </div>
        );
      }}
    </PopOver>
  );
};

export function getViewDelta(currentView: TableView, viewToLoad: TableView) {
  let columnViews: Record<ColumnName, ColumnView> | undefined;
  if (viewToLoad.c) {
    columnViews = {};
    for (const [column, {v, fs}] of Object.entries(viewToLoad.c)) {
      let deltaV: 1 | 0 | undefined;
      let deltaFs: ControlState | null | undefined;
      if (v !== undefined && v !== currentView.c?.[column]?.v) {
        deltaV = v;
      }
      if (fs !== undefined) {
        const currentFs = currentView.c?.[column]?.fs;
        if (currentFs === undefined || !richJSONValuesEqual(fs, currentFs)) {
          deltaFs = fs;
        }
      }
      if (deltaV !== undefined || deltaFs !== undefined) {
        columnViews[column] = {v: deltaV, fs: deltaFs};
      }
    }
  }
  const delta: TableView = {
    c: columnViews && Object.keys(columnViews).length ? columnViews : undefined,
    gf: viewToLoad.gf === undefined || viewToLoad.gf === currentView.gf ? undefined : viewToLoad.gf,
    cg: !viewToLoad.cg || (currentView.cg && arraysEqual(currentView.cg, viewToLoad.cg)) ? undefined : viewToLoad.cg,
    s:
      !viewToLoad.s || (currentView.s && arraysEqual(currentView.s, viewToLoad.s, objectsEqual))
        ? undefined
        : viewToLoad.s,
  };
  return {delta, deltaSummary: getTableViewSummary(delta)};
}

function getTableViewSummary(view: TableView): TableViewSummary {
  const globalFilter = view.gf !== undefined;
  const visibility = !!view.c && Object.values(view.c).some((c) => c.v !== undefined);
  const columnFilters = !!view.c && Object.values(view.c).some((c) => c.fs !== undefined);
  const columnGroups = !!view.cg;
  const sort = !!view.s;
  return {
    globalFilter,
    visibility,
    columnFilters,
    columnGroups,
    sort,
    anything: globalFilter || visibility || columnFilters || columnGroups || sort,
  };
}

interface TableViewSummary {
  readonly globalFilter: boolean;
  readonly visibility: boolean;
  readonly columnFilters: boolean;
  readonly columnGroups: boolean;
  readonly sort: boolean;
  readonly anything: boolean;
}
