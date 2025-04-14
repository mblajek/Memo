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
import {DEFAULT_SCROLL_OPTIONS, scrollIntoView} from "components/ui/scroll_into_view";
import {SearchInput} from "components/ui/SearchInput";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {SplitButton} from "components/ui/SplitButton";
import {
  PartName,
  TABLE_SAVED_VIEW_PARTS,
  useTableSavedViewIndicators,
} from "components/ui/Table/table_saved_view_indicators";
import {
  getStencilledTableView,
  getTableViewFullSummary,
  TableView,
  tableViewsSerialisation,
} from "components/ui/Table/table_views";
import {TextInput} from "components/ui/TextInput";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {Autofocus} from "components/utils/Autofocus";
import {cx} from "components/utils/classnames";
import {delayedAccessor} from "components/utils/debounce";
import {isDEV} from "components/utils/dev_mode";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
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
  runWithOwner,
  Show,
  splitProps,
  untrack,
  VoidComponent,
} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Button, ButtonProps} from "../Button";
import {PopOver} from "../PopOver";

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
  const indicators = useTableSavedViewIndicators();
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
      // TODO: Finalise the advanced view and make it public.
      if (isDEV()) {
        setAdvancedView(state.adv);
      }
    },
    storage: userStorageStorage("settings:table.saves"),
    version: [1],
  });
  const codeSerialiser = tableViewsSerialisation.codeSerialiser();
  const confirmation = createConfirmation();

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
      {(popOver) => {
        const currentView = createMemo(() => props.getCurrentView());
        const currentViewSummary = createMemo(() => getTableViewFullSummary({newView: currentView()}));
        const [currentViewCode, setCurrentViewCode] = createSignal("");
        const [getNewName, setNewName] = createSignal("");
        const newName = () => getNewName().trim();
        createEffect(() =>
          codeSerialiser
            .serialise({tableId: props.staticPersistenceKey, viewName: newName(), view: currentView()})
            .then((code) => setCurrentViewCode(code)),
        );
        const newNameConflict = () => persistedState().states.some((st) => st.name === newName());

        function getNamedCurrentView(): NamedTableView {
          return {name: newName(), state: props.getCurrentView()};
        }
        function saveCurrentView() {
          setPersistedState((s) => ({
            ...s,
            states: [...s.states, getNamedCurrentView()],
          }));
        }

        async function withClosedPopOver<T>(func: () => Promise<T>) {
          popOver.close();
          return await func().then(() => setTimeout(() => popOver.open(), 100));
        }

        async function editView(oldView: NamedTableView) {
          // eslint-disable-next-line solid/reactivity
          return await runWithOwner(owner, async () => {
            const editing = persistedState().states.some((st) => st.name === oldView.name);
            const [getNewName, setNewName] = createSignal(oldView.name);
            const newName = () => getNewName().trim();
            const [newViewState, setNewViewState] = createSignal({...oldView.state});
            const oldViewSummary = getTableViewFullSummary({newView: oldView.state});
            const newViewSummary = createMemo(() => getTableViewFullSummary({newView: newViewState()}));
            const newNameConflict = createMemo(() => {
              const conflict = persistedState().states.some((st) => st.name === newName());
              return editing ? conflict && newName() !== oldView.name : conflict;
            });
            // eslint-disable-next-line solid/reactivity
            const delayedNewNameConflict = delayedAccessor(newNameConflict, {outputImmediately: (c) => !c});
            function fieldName(field: string) {
              return t([`models.table_saved_view.${field}`, `models.generic.${field}`]);
            }
            const defaultViewSummary = props.defaultTableView
              ? getTableViewFullSummary({newView: props.defaultTableView})
              : undefined;
            const confirmed = await confirmation.confirm({
              title: t(editing ? "forms.table_saved_view_edit.form_name" : "forms.table_saved_view_create.form_name"),
              body: (controller) => (
                <Autofocus>
                  <div class="flex flex-col gap-2 mb-2">
                    <div class="flex flex-col">
                      <div class="flex justify-between gap-1">
                        <StandaloneFieldLabel>
                          <Capitalize text={fieldName("name")} />
                        </StandaloneFieldLabel>
                        <Show when={advancedView()}>
                          <indicators.Indicator
                            viewSummary={newViewSummary()}
                            title={[<indicators.Explanation viewSummary={newViewSummary()} />, {placement: "right"}]}
                          />
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
                                        (oldViewSummary.modifiesSummary[partName]
                                          ? oldViewSummary
                                          : defaultViewSummary || currentViewSummary()
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
                                        ? oldView.state[partName] || (props.defaultTableView || currentView())[partName]
                                        : undefined,
                                  }))
                                }
                                small
                              />
                            </>
                          );
                        };
                        return (
                          <>
                            <div
                              class="grid gap-x-3 gap-y-1 me-auto align-baseline"
                              style={{"grid-template-columns": "auto auto auto 1fr"}}
                            >
                              <For each={TABLE_SAVED_VIEW_PARTS}>{(part) => <SingleSel staticPartName={part} />}</For>
                            </div>
                            {/* TODO: Add a section to manage individual columns. */}
                          </>
                        );
                      }}
                    </Show>
                  </div>
                </Autofocus>
              ),
              confirmText: t(editing ? "forms.table_saved_view_edit.submit" : "forms.table_saved_view_create.submit"),
              confirmDisabled: () => !newName() || newNameConflict() || !newViewSummary().modifiesSummary.any,
              modalStyle: advancedView() ? MODAL_STYLE_PRESETS.medium : undefined,
            });
            if (confirmed) {
              // eslint-disable-next-line solid/reactivity
              const theNewView: NamedTableView = {name: newName(), state: newViewState()};
              setPersistedState((s) => ({
                ...s,
                states: editing
                  ? [...s.states.map((st) => (st.name === oldView.name ? theNewView : st))]
                  : [...s.states, theNewView],
              }));
            }
          });
        }

        async function confirmAndDelete(view: NamedTableView) {
          const summary = getTableViewFullSummary({newView: view.state});
          if (
            await confirmation.confirm({
              title: t("forms.table_saved_view_delete.form_name"),
              body: (
                <div class="flex flex-col gap-1 mb-1">
                  <div>{t("forms.table_saved_view_delete.confirmation_text")}</div>
                  <div class="px-1 flex gap-2 justify-between rounded border border-gray-300">
                    {view.name}
                    <Show when={advancedView()}>
                      <indicators.Indicator
                        viewSummary={summary}
                        title={[<indicators.Explanation viewSummary={summary} />, {placement: "right"}]}
                      />
                    </Show>
                  </div>
                </div>
              ),
            })
          ) {
            setPersistedState((s) => ({
              ...s,
              states: s.states.filter((st) => st.name !== view.name),
            }));
          }
        }

        let container: HTMLDivElement | undefined;
        function blinkViewName(name: string) {
          const button = container?.querySelector(`[data-view-name="${name}"]`);
          button?.scrollIntoView(DEFAULT_SCROLL_OPTIONS);
          button?.animate([{outlineOffset: "-1px"}, {opacity: "0.6", outlineWidth: "6px", outlineOffset: "-7px"}], {
            direction: "alternate",
            easing: "ease-in-out",
            duration: 230,
            iterations: 6,
          });
        }
        const [inputCode, setInputCode] = createSignal("");
        const [codeErrorMessage, setCodeErrorMessage] = createSignal<string>();
        createEffect(() => setInputCode(currentViewCode()));
        createEffect(() => {
          const code = inputCode().trim();
          if (code && code !== currentViewCode()) {
            codeSerialiser.deserialise(code).then(
              ({tableId, viewName, view}) =>
                untrack(() => {
                  if (tableId && tableId !== props.staticPersistenceKey) {
                    setCodeErrorMessage(t("tables.saved_views.code_error.different_table"));
                  } else {
                    if (viewName) {
                      const state = persistedState().states.find((st) => st.name === viewName);
                      if (state) {
                        // TODO: Adjust behaviour for when the state is identical/compatible and
                        // when it is different.
                        blinkViewName(viewName);
                      } else {
                        setNewName(viewName);
                      }
                    }
                    props.onLoad(view);
                    setCodeErrorMessage(undefined);
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }
                }),
              () => setCodeErrorMessage(t("tables.saved_views.code_error")),
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
          <div ref={container} class="p-2 flex flex-col gap-3 items-stretch min-h-0">
            <div class="flex gap-2 items-baseline justify-between">
              <div class="font-bold">
                {t("tables.saved_views.title")}{" "}
                <DocsModalInfoIcon href="/help/table-saved-views" onClick={popOver.close} />
              </div>
              <Show when={isDEV()}>
                <CheckboxInput
                  labelBefore={
                    <span class="font-normal text-xs">{t("tables.saved_views.advanced_view.abbreviation")} </span>
                  }
                  title={t("tables.saved_views.advanced_view")}
                  checked={advancedView()}
                  onChecked={setAdvancedView}
                />
              </Show>
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
                                <Show when={advancedView()}>
                                  <indicators.Explanation viewSummary={summary()} />
                                </Show>
                              </div>,
                              {placement: "left", offset: [0, 4], delay: [600, undefined]},
                            ]}
                            onClick={() => {
                              const any = summary().modifiesBaseSummary?.any;
                              props.onLoad(state().state as TableView);
                              if (any) {
                                popOver.close();
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
                            <Show when={advancedView()}>
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
                            parentPopOver={popOver}
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
                                    onClick={() =>
                                      setPersistedState((s) => ({
                                        ...s,
                                        states: s.states.map((st) =>
                                          st.name === state().name
                                            ? {
                                                ...st,
                                                state: getStencilledTableView({
                                                  view: props.getCurrentView(),
                                                  stencil: st.state,
                                                }),
                                              }
                                            : st,
                                        ),
                                      }))
                                    }
                                  />
                                  <MenuItem
                                    icon={actionIcons.Copy}
                                    label={t("tables.saved_views.copy_code")}
                                    onClick={() =>
                                      codeSerialiser
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
                                    onClick={() =>
                                      withClosedPopOver(
                                        // eslint-disable-next-line solid/reactivity
                                        () => editView(state()),
                                      )
                                    }
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
                                      popOver.close();
                                      withClosedPopOver(
                                        // eslint-disable-next-line solid/reactivity
                                        () => editView({...state(), name: newName}),
                                      );
                                    }}
                                  />
                                  <MenuItem
                                    icon={actionIcons.Delete}
                                    label={t("actions.delete")}
                                    onClick={() =>
                                      withClosedPopOver(
                                        // eslint-disable-next-line solid/reactivity
                                        () => confirmAndDelete(state()),
                                      )
                                    }
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
            <div class="grid gap-x-1" style={{"grid-template-columns": "1fr min(6rem)"}}>
              <SearchInput
                placeholder={t("tables.saved_views.new_placeholder")}
                value={newName()}
                onValueChange={setNewName}
                clearButton={false}
              />
              <SplitButton
                class="secondary small"
                disabled={!newName() || newNameConflict()}
                onClick={() => {
                  saveCurrentView();
                  setNewName("");
                }}
                popOver={
                  advancedView() ? (
                    <SimpleMenu>
                      <Button
                        onClick={() =>
                          withClosedPopOver(
                            // eslint-disable-next-line solid/reactivity
                            () => editView(getNamedCurrentView()),
                          )
                        }
                      >
                        {t("tables.saved_views.edit_and_save")}
                      </Button>
                    </SimpleMenu>
                  ) : undefined
                }
                title={t("tables.saved_views.save_hint")}
              >
                {t("actions.save")}
              </SplitButton>
              <Show when={advancedView()}>
                <div class="col-start-2 flex flex-col items-end">
                  <indicators.Indicator
                    viewSummary={currentViewSummary()}
                    title={[<indicators.Explanation viewSummary={currentViewSummary()} />, {placement: "bottom"}]}
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
                    onClick={popOver.close}
                  />
                </div>
                <CopyToClipboard text={currentViewCode()} showDisabledOnEmpty />
              </div>
              <TextInput
                class="grow w-full min-h-small-input px-1 font-mono text-xs"
                aria-invalid={!!codeErrorMessage()}
                value={inputCode()}
                onFocus={({target}) => target.select()}
                onInput={({target}) => setInputCode(target.value)}
                onFocusOut={() => {
                  setInputCode(currentViewCode());
                  setCodeErrorMessage(undefined);
                }}
              />
              <HideableSection class="col-span-full" show={codeErrorMessage()}>
                <div class="text-red-600">{codeErrorMessage()}</div>
              </HideableSection>
            </div>
          </div>
        );
      }}
    </PopOver>
  );
};
