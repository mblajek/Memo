import {createPersistence} from "components/persistence/persistence";
import {richJSONSerialiser, RichJSONValue, Serialiser} from "components/persistence/serialiser";
import {userStorageStorage} from "components/persistence/storage";
import {createConfirmation} from "components/ui/confirmation";
import {useDocsModalInfoIcon} from "components/ui/docs_modal";
import {HideableSection} from "components/ui/HideableSection";
import {actionIcons} from "components/ui/icons";
import {scrollIntoView} from "components/ui/scroll_into_view";
import {SearchInput} from "components/ui/SearchInput";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {EmptyValueSymbol} from "components/ui/symbols";
import {getTableViewDelta, TableView, tableViewsSerialisation} from "components/ui/Table/table_views";
import {TextInput} from "components/ui/TextInput";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {cx, delayedAccessor, useLangFunc} from "components/utils";
import {Autofocus} from "components/utils/Autofocus";
import {VsSave} from "solid-icons/vs";
import {createMemo, createSignal, Index, Show, VoidComponent} from "solid-js";
import {Button} from "../Button";
import {PopOver, PopOverControl} from "../PopOver";
import {useTable} from "./TableContext";

type _Directives = typeof scrollIntoView | typeof title;

interface Props {
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
  const table = useTable();
  const persistenceKey = table.options.meta?.tquery?.persistenceKey;
  if (!persistenceKey) {
    // eslint-disable-next-line solid/components-return-once
    return undefined;
  }
  const {DocsModalInfoIcon} = useDocsModalInfoIcon();
  const [persistedState, setPersistedState] = createSignal<PersistedState>({states: []});
  createPersistence<PersistedState>({
    value: persistedState,
    onLoad: (state) => setPersistedState(state),
    serialiser: stateSerialiser(),
    storage: userStorageStorage(`table.saves.${persistenceKey}`),
  });
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
        states: [...s.states.filter((st) => st.name !== oldName), {name: theNewName, state: props.getCurrentView()}],
      }));
      savedPopOver?.open();
    }
  }

  const statesToShow = () => [
    ...(props.defaultTableView
      ? [{default: true, name: t("tables.saved_views.default_view_name"), state: props.defaultTableView}]
      : []),
    ...persistedState().states.toSorted((a, b) => a.name.localeCompare(b.name)),
  ];

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
        const newNameConflict = () => persistedState().states.some((st) => st.name === newName());
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
                <Index each={statesToShow()} fallback={<EmptyValueSymbol />}>
                  {(state) => {
                    const deltaSummary = createMemo(() => getTableViewDelta(currentView(), state().state).deltaSummary);
                    return (
                      <div class="flex items-stretch gap-1 me-2">
                        <div class="grow max-w-md" use:scrollIntoView={state().name === newName()}>
                          <Button
                            class={cx(
                              "w-full minimal !px-1 text-start",
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
                                <actionIcons.ThreeDots />
                              </Button>
                            )}
                            parentPopOver={popOver}
                          >
                            <SimpleMenu onClick={popOver.close}>
                              <Button
                                onClick={() =>
                                  setPersistedState((s) => ({
                                    ...s,
                                    states: s.states.map((st) =>
                                      st.name === state().name ? {...st, state: props.getCurrentView()} : st,
                                    ),
                                  }))
                                }
                              >
                                {t("tables.saved_views.overwrite_with_current")}
                              </Button>
                              <Button
                                onClick={() => {
                                  popOver.close();
                                  confirmAndRename(state().name);
                                }}
                              >
                                {t("actions.rename")}
                              </Button>
                              <Button
                                onClick={() =>
                                  setPersistedState((s) => ({
                                    ...s,
                                    states: s.states.filter((st) => st.name !== state().name),
                                  }))
                                }
                              >
                                {t("actions.delete")}
                              </Button>
                            </SimpleMenu>
                          </PopOver>
                        </Show>
                      </div>
                    );
                  }}
                </Index>
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
                    states: [...s.states, {name: newName(), state: props.getCurrentView()}],
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
