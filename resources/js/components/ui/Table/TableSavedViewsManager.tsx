import {createPersistence} from "components/persistence/persistence";
import {richJSONSerialiser, RichJSONValue, Serialiser} from "components/persistence/serialiser";
import {userStorageStorage} from "components/persistence/storage";
import {createConfirmation} from "components/ui/confirmation";
import {CopyToClipboard} from "components/ui/CopyToClipboard";
import {useDocsModalInfoIcon} from "components/ui/docs_modal";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {HideableSection} from "components/ui/HideableSection";
import {actionIcons} from "components/ui/icons";
import {DEFAULT_SCROLL_OPTIONS, scrollIntoView} from "components/ui/scroll_into_view";
import {SearchInput} from "components/ui/SearchInput";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {getTableViewDelta, TableView, tableViewsSerialisation} from "components/ui/Table/table_views";
import {TextInput} from "components/ui/TextInput";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {Autofocus} from "components/utils/Autofocus";
import {cx} from "components/utils/classnames";
import {delayedAccessor} from "components/utils/debounce";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {IconTypes} from "solid-icons";
import {VsSave} from "solid-icons/vs";
import {createEffect, createMemo, createSignal, Index, JSX, Show, splitProps, untrack, VoidComponent} from "solid-js";
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

interface PersistedState {
  readonly states: readonly NamedTableView[];
}

interface NamedTableView {
  readonly default?: boolean;
  readonly name: string;
  readonly state: TableView;
}

function stateSerialiser(): Serialiser<PersistedState> {
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
    deserialise(value): PersistedState {
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
  const [persistedState, setPersistedState] = createSignal<PersistedState>({states: []});
  createPersistence<PersistedState>({
    value: persistedState,
    onLoad: (state) => setPersistedState(state),
    serialiser: stateSerialiser(),
    storage: userStorageStorage(`table.saves.${props.staticPersistenceKey}`),
  });
  const codeSerialiser = tableViewsSerialisation.codeSerialiser();
  const confirmation = createConfirmation();
  let savedPopOver: PopOverControl | undefined;

  async function confirmAndRename(oldName: string) {
    const [getNewName, setNewName] = createSignal(oldName);
    const newName = () => getNewName().trim();
    const newNameConflict = () => newName() !== oldName && persistedState().states.some((st) => st.name === newName());
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
              <div class="text-red-600">{t("tables.saved_views.rename_conflict")}</div>
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
        states: [...s.states.map((st) => (st.name === oldName ? {...st, name: theNewName} : st))],
      }));
      setTimeout(() => savedPopOver?.open(), 100);
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
          <actionIcons.SaveTableView size="18" />
        </Button>
      )}
    >
      {(popOver) => {
        savedPopOver = popOver;
        const currentView = createMemo(() => props.getCurrentView());
        const [currentViewCode, setCurrentViewCode] = createSignal("");
        const [getNewName, setNewName] = createSignal("");
        const newName = () => getNewName().trim();
        createEffect(() =>
          codeSerialiser
            .serialise({tableId: props.staticPersistenceKey, viewName: newName(), view: currentView()})
            .then((code) => setCurrentViewCode(code)),
        );
        const newNameConflict = () => persistedState().states.some((st) => st.name === newName());

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
            <div class="font-bold">
              {t("tables.saved_views.title")}{" "}
              <DocsModalInfoIcon href="/help/table-saved-views" onClick={popOver.close} />
            </div>
            <div class="grow overflow-y-auto -me-2">
              <div class="flex flex-col items-stretch gap-1">
                <Index each={statesToShow()} fallback={<EmptyValueSymbol />}>
                  {(state) => {
                    const deltaSummary = createMemo(() => getTableViewDelta(currentView(), state().state).deltaSummary);
                    return (
                      <div class="flex items-stretch gap-1 me-2">
                        <div class="grow max-w-md" use:scrollIntoView={state().name === newName()}>
                          <Button
                            data-view-name={state().name}
                            class={cx(
                              "w-full minimal !px-1 text-start outline outline-0 outline-memo-active",
                              deltaSummary().anything ? undefined : "!bg-select",
                              state().default ? "text-grey-text" : undefined,
                            )}
                            title={[
                              deltaSummary().anything
                                ? t("tables.saved_views.load_hint")
                                : t("tables.saved_views.load_hint_no_change"),
                              {placement: "left", offset: [0, 4], delay: [1000, undefined]},
                            ]}
                            onClick={() => {
                              const {anything} = deltaSummary();
                              props.onLoad(state().state as TableView);
                              if (anything) {
                                popOver.close();
                              }
                            }}
                          >
                            {state().name}
                            <Show when={state().name === newName()}>
                              <span use:title={t("tables.saved_views.save_hint_conflict")}>
                                <WarningMark />
                              </span>
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
                                <actionIcons.ThreeDotsBig />
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
                                          st.name === state().name ? {...st, state: props.getCurrentView()} : st,
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
                                    icon={actionIcons.Rename}
                                    label={t("actions.rename")}
                                    onClick={() => {
                                      savedPopOver?.close();
                                      confirmAndRename(state().name);
                                    }}
                                  />
                                  <MenuItem
                                    icon={actionIcons.Delete}
                                    label={t("actions.delete")}
                                    onClick={() =>
                                      setPersistedState((s) => ({
                                        ...s,
                                        states: s.states.filter((st) => st.name !== state().name),
                                      }))
                                    }
                                  />
                                </SimpleMenu>
                              );
                            }}
                          </PopOver>
                        </Show>
                      </div>
                    );
                  }}
                </Index>
              </div>
            </div>
            <div class="flex items-stretch gap-1">
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
                    states: [...s.states, {name: newName(), state: props.getCurrentView()}],
                  }));
                  setNewName("");
                }}
                title={t("tables.saved_views.save_hint")}
              >
                {t("actions.save")}
              </Button>
            </div>
            <div class="flex flex-col">
              <div class="flex gap-1 items-center">
                <div class="grow pe-4">
                  <StandaloneFieldLabel>{t("tables.saved_views.current_view_code")}</StandaloneFieldLabel>
                </div>
                <div class="flex items-center gap-1">
                  <TextInput
                    class="grow w-20 min-h-small-input px-1 font-mono text-xs"
                    aria-invalid={!!codeErrorMessage()}
                    value={inputCode()}
                    onFocus={({target}) => target.select()}
                    onInput={({target}) => setInputCode(target.value)}
                    onFocusOut={() => {
                      setInputCode(currentViewCode());
                      setCodeErrorMessage(undefined);
                    }}
                  />
                  <CopyToClipboard text={currentViewCode()} showDisabledOnEmpty />
                </div>
                <DocsModalInfoIcon
                  href="/help/table-saved-views-codes.part"
                  fullPageHref="/help/table-saved-views#codes"
                  onClick={popOver.close}
                />
              </div>
              <HideableSection show={codeErrorMessage()}>
                <div class="text-red-600">{codeErrorMessage()}</div>
              </HideableSection>
            </div>
          </div>
        );
      }}
    </PopOver>
  );
};
