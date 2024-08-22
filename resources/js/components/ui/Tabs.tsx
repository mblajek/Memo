import {Accessor, For, JSX, VoidComponent, createComputed, createSignal, on} from "solid-js";
import {cx, debouncedAccessor} from "../utils";
import {TrackingMarker} from "../utils/TrackingMarker";
import {Button} from "./Button";

interface Props {
  readonly tabs: readonly Tab[];
  readonly initialActiveTab?: string;
  readonly activeTab?: string;
  readonly onActiveTabChange?: (activeTab: string) => void;
}

interface Tab {
  readonly id: string;
  readonly label: JSX.Element;
  /** The contents of the tab. This function is called immediately and only once for every tab. */
  readonly contents: (isActive: Accessor<boolean>) => JSX.Element;
}

export const Tabs: VoidComponent<Props> = (props) => {
  // eslint-disable-next-line solid/reactivity
  const [activeId, setActiveId] = createSignal(props.initialActiveTab || props.activeTab || props.tabs[0]?.id);
  createComputed(
    on(
      () => props.activeTab,
      (activeTab) => {
        if (activeTab) {
          setActiveId(activeTab);
        }
      },
    ),
  );
  createComputed(
    on(activeId, (activeId) => {
      if (activeId) {
        props.onActiveTabChange?.(activeId);
      }
    }),
  );
  return (
    <div class="flex flex-col items-stretch gap-1">
      <TrackingMarker
        activeId={activeId()}
        markerClass={({active}) => cx("border-b-2", active ? "border-memo-active" : "border-transparent")}
      >
        {(MarkerTarget) => (
          <div role="tablist" class="flex items-stretch">
            <For each={props.tabs}>
              {(tab) => {
                const isActive = () => tab.id === activeId();
                return (
                  <Button
                    class={cx(
                      "flex-shrink min-w-0 px-1.5 pt-1 text-black hover:bg-hover rounded-t-lg border overflow-clip",
                      isActive()
                        ? "border-input-border border-b-transparent"
                        : "text-opacity-70 border-gray-100 border-b-input-border",
                    )}
                    role="tab"
                    aria-selected={isActive()}
                    onClick={() => setActiveId(tab.id)}
                  >
                    <MarkerTarget id={tab.id} class="w-full h-full mb-px">
                      {tab.label}
                    </MarkerTarget>
                  </Button>
                );
              }}
            </For>
            <div class="grow border-b border-input-border" />
          </div>
        )}
      </TrackingMarker>
      <div>
        <For each={props.tabs}>
          {(tab) => {
            // Delay hiding the contents by 0ms to avoid showing neither of the tabs for a moment,
            // as this might cause the page to jump up because the contents is suddenly much shorter.
            // eslint-disable-next-line solid/reactivity
            const isActive = debouncedAccessor(() => tab.id === activeId(), {
              timeMs: 0,
              outputImmediately: (active) => active,
            });
            return <div class={cx(isActive() ? undefined : "hidden")}>{tab.contents(isActive)}</div>;
          }}
        </For>
      </div>
    </div>
  );
};
