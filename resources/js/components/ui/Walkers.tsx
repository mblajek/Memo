import {createPersistence} from "components/persistence/persistence";
import {userStorageStorage} from "components/persistence/storage";
import {Random} from "components/utils/random";
import {Timeout} from "components/utils/timeout";
import {createEffect, createSignal, For, getOwner, JSX, onMount, runWithOwner, Show, VoidComponent} from "solid-js";
import {Dynamic, Portal} from "solid-js/web";

type Dir = 1 | -1;

interface WalkerProps {
  readonly onDone: () => void;
  readonly dir: Dir;
}

const WalkerC1: VoidComponent<WalkerProps> = (props) => {
  const margPx = 100;
  const speedPxPerSec = 30;
  return (
    <object
      ref={(img) =>
        onMount(() => {
          const totalDist = window.innerWidth + 2 * margPx;
          const stops = [{left: `${-margPx}px`}, {left: `${window.innerWidth + margPx}px`}];
          if (props.dir < 0) {
            stops.reverse();
          }
          img
            .animate(stops, {
              duration: (totalDist / speedPxPerSec) * 1000,
            })
            .addEventListener("finish", props.onDone);
        })
      }
      class="h-20 absolute bottom-0 pointer-events-auto"
      style={{transform: props.dir > 0 ? undefined : "scaleX(-1)"}}
      type="image/svg+xml"
      data="/img/walkers/c1.svg"
    />
  );
};

const WALKERS = {
  c1: WalkerC1,
};

type WalkerKeys = keyof typeof WALKERS;

type PersistedState = {
  en?: boolean;
};

const WALKER_TIMEOUT_RANGE_MINS = [100, 200] as const;

export const Walkers: VoidComponent = () => {
  const owner = getOwner();
  const [enabled, setEnabled] = createSignal(false);
  createPersistence<PersistedState>({
    value: () => ({
      en: enabled(),
    }),
    onLoad: (val) => {
      setEnabled(val.en || false);
    },
    storage: userStorageStorage("walkers"),
    version: [1],
  });
  const [walkers, setWalkers] = createSignal<readonly JSX.Element[]>([]);
  function createWalker(walkerKey: WalkerKeys, dir: Dir) {
    const walker = (
      <Dynamic
        component={WALKERS[walkerKey]}
        dir={dir}
        onDone={() => setWalkers((ws) => ws.filter((w) => w !== walker))}
      />
    );
    setWalkers((ws) => [...ws, walker]);
  }
  const timeout = new Timeout();
  function scheduleNext() {
    if (enabled()) {
      timeout.set(
        () => {
          runWithOwner(owner, () => createWalker("c1", Random.RANDOM.nextBool() ? 1 : -1));
          scheduleNext();
        },
        Random.RANDOM.nextInt(...WALKER_TIMEOUT_RANGE_MINS) * 60_000,
      );
    } else {
      setWalkers([]);
    }
  }
  createEffect(scheduleNext);
  return (
    <Show when={walkers().length}>
      <Portal>
        <div class="absolute inset-0 z-modal pointer-events-none">
          <For each={walkers()}>{(walker) => walker}</For>
        </div>
      </Portal>
    </Show>
  );
};
