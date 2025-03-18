import {VisibilityState} from "@tanstack/solid-table";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {actionIcons} from "components/ui/icons";
import {ColumnName} from "components/ui/Table/ColumnName";
import {useTable} from "components/ui/Table/TableContext";
import {cx} from "components/utils/classnames";
import {debouncedAccessor} from "components/utils/debounce";
import {useLangFunc} from "components/utils/lang";
import {createTextFilter} from "components/utils/text_util";
import {OcSearch2} from "solid-icons/oc";
import {RiSystemEyeCloseFill} from "solid-icons/ri";
import {For, Show, VoidComponent, createComputed, createMemo, createSignal, onMount} from "solid-js";
import {Button} from "../Button";
import {createHoverSignal, hoverEvents, hoverSignal} from "../hover_signal";
import {PopOver, PopOverControl} from "../PopOver";
import {SearchInput} from "../SearchInput";
import {title} from "../title";

type _Directives = typeof title | typeof hoverSignal;

const DEBOUNCE_TIME_MS = 1500;

export const TableColumnVisibilityController: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const defaultColumnVisibility = table.options.meta?.defaultColumnVisibility;
  const [search, setSearch] = createSignal("");
  const translations = table.options.meta?.translations;
  let searchInput: HTMLInputElement | undefined;
  const searchFilter = createMemo(() => createTextFilter(search()));
  function matchesSearch(columnId: string) {
    if (!translations) {
      return true;
    }
    const filter = searchFilter();
    return !filter || filter(translations.columnName(columnId));
  }
  const displayedColumns = createMemo(() =>
    table.getAllLeafColumns().filter((column) => {
      const groupingInfo = column.columnDef.meta?.tquery?.groupingInfo?.();
      return groupingInfo && !groupingInfo.isCount && matchesSearch(column.id);
    }),
  );
  const [visibility, setVisibility] = createSignal<Readonly<VisibilityState>>();
  const isDefaultVisibility = () => {
    const vis = visibility();
    return (
      !!vis &&
      Object.entries(vis).every(
        ([id, visible]) =>
          table.getColumn(id)?.columnDef.meta?.tquery?.groupingInfo?.().isCount ||
          !matchesSearch(id) ||
          visible === (defaultColumnVisibility?.()[id] ?? true),
      )
    );
  };
  const isDefaultSizing = () => !Object.keys(table.getState().columnSizing).some(matchesSearch);
  // eslint-disable-next-line solid/reactivity
  const debouncedVisibility = debouncedAccessor(visibility, {timeMs: DEBOUNCE_TIME_MS});
  createComputed(() => {
    const vis = debouncedVisibility();
    if (vis) {
      table.setColumnVisibility(vis);
    }
  });
  const resetHover = createHoverSignal();

  const Content: VoidComponent<{readonly popOver: PopOverControl}> = (props) => {
    setVisibility({...table.getState().columnVisibility});
    setSearch("");
    onMount(() => setTimeout(() => searchInput?.focus()));
    return (
      <div class="flex flex-col min-h-0 items-stretch" onClick={() => searchInput?.focus()}>
        <Show when={translations}>
          <div class="flex items-center">
            <OcSearch2 class="shrink-0 px-1" size="24" />
            <SearchInput
              ref={searchInput}
              divClass="flex-grow"
              class="outline-none"
              value={search()}
              onValueChange={setSearch}
              placeholder={t("tables.columns_search.placeholder")}
              autofocus
            />
          </div>
        </Show>
        <div class="overflow-y-auto flex flex-col gap-0.5">
          <div class="flex flex-col">
            <For
              each={displayedColumns()}
              fallback={
                <Show when={search()} fallback={<EmptyValueSymbol />}>
                  <div class="p-1 text-center text-grey-text">{t("tables.columns_search.no_results")}</div>
                </Show>
              }
            >
              {(column) => {
                const groupingInfo = createMemo(() => column.columnDef.meta?.tquery?.groupingInfo?.());
                const hover = createHoverSignal();
                const selectBg = () =>
                  resetHover() ? defaultColumnVisibility?.()[column.id] : visibility()?.[column.id];
                return (
                  <label
                    class={cx(
                      "px-2 pt-0.5 hover:bg-hover flex justify-between gap-2 items-baseline select-none",
                      selectBg() ? "!bg-select" : undefined,
                    )}
                    use:hoverSignal={hover}
                  >
                    <div class="flex gap-2 items-baseline">
                      <input
                        class={column.getCanHide() ? undefined : "invisible"}
                        name={`column_visibility_${column.id}`}
                        checked={visibility()?.[column.id]}
                        onChange={({target}) => setVisibility((v) => ({...v, [column.id]: target.checked}))}
                        type="checkbox"
                        disabled={!column.getCanHide() || groupingInfo()?.isForceShown}
                        use:title={
                          groupingInfo()?.isForceShown ? t("tables.column_groups.column_status.force_shown") : undefined
                        }
                      />{" "}
                      <ColumnName def={column.columnDef} />
                      <Show
                        when={
                          visibility()?.[column.id] &&
                          !defaultColumnVisibility?.()[column.id] &&
                          !column.columnDef.meta?.config?.persistVisibility
                        }
                      >
                        <span use:title={t("tables.no_persist_visibility")}>
                          <RiSystemEyeCloseFill class="text-grey-text" size="12" />
                        </span>
                      </Show>
                      <Show when={groupingInfo()?.isGrouped}>
                        <span class="text-memo-active" use:title={t("tables.column_groups.column_status.grouped")}>
                          {t("tables.column_groups.grouping_symbol")}
                        </span>
                      </Show>
                    </div>
                    <Button
                      class={cx("self-center", hover() ? "opacity-100" : "opacity-0")}
                      onClick={() => {
                        setVisibility((v) => ({...v, [column.id]: true}));
                        const tryFindInterval = 100;
                        let attempts = DEBOUNCE_TIME_MS / tryFindInterval + 1;
                        function attempt() {
                          if (!attempts--) {
                            return;
                          }
                          const header = document.querySelector(`[data-header-for-column="${column.id}"]`);
                          if (!header) {
                            setTimeout(attempt, tryFindInterval);
                            return;
                          }
                          header.scrollIntoView({inline: "center", behavior: "smooth"});
                          header.animate([{}, {backgroundColor: "var(--tc-select)"}], {
                            direction: "alternate",
                            duration: 230,
                            iterations: 6,
                          });
                          props.popOver.close();
                        }
                        attempt();
                      }}
                      title={t("tables.scroll_to_column")}
                    >
                      <actionIcons.FocusHorizontally class="text-grey-text" size="14" />
                    </Button>
                  </label>
                );
              }}
            </For>
          </div>
        </div>
        <div class="p-1 flex flex-col gap-1">
          <Show when={defaultColumnVisibility}>
            {(defaultColumnVisibility) => (
              <Button
                class="secondary small"
                onClick={() =>
                  setVisibility((visibility) => {
                    const vis = {...visibility};
                    for (const [id, defVisible] of Object.entries(defaultColumnVisibility()())) {
                      if (matchesSearch(id)) {
                        vis[id] = defVisible;
                      }
                    }
                    return vis;
                  })
                }
                disabled={isDefaultVisibility()}
                // Use inert to make the parent handle onClick also when disabled.
                inert={isDefaultVisibility()}
                {...hoverEvents(resetHover)}
              >
                {t("actions.restore_default")}
              </Button>
            )}
          </Show>
          <Button
            class="secondary small"
            onClick={() =>
              // eslint-disable-next-line solid/reactivity
              table.setColumnSizing((sizing) => {
                if (!search()) {
                  return {};
                }
                const siz = {...sizing};
                for (const id of Object.keys(siz)) {
                  if (matchesSearch(id)) {
                    delete siz[id];
                  }
                }
                return siz;
              })
            }
            disabled={isDefaultSizing()}
            // Use inert to make the parent handle onClick also when disabled.
            inert={isDefaultSizing()}
          >
            {t("tables.reset_column_sizes")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <PopOver
      trigger={(popOver) => (
        <Button
          class="rounded px-2 border border-input-border pressedWithShadow"
          onClick={popOver.open}
          disabled={!table.getAllLeafColumns().length}
        >
          <actionIcons.Columns class="inlineIcon" /> {t("tables.choose_columns")}
        </Button>
      )}
    >
      {(popOver) => <Content popOver={popOver} />}
    </PopOver>
  );
};
