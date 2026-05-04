import {useNavigate} from "@solidjs/router";
import {useQuery} from "@tanstack/solid-query";
import {Maurtue} from "components/ui/Maurtue";
import {MemoLoader} from "components/ui/MemoLoader";
import {Wrights} from "components/ui/Wrights";
import {useEventListener} from "components/utils/event_listener";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {currentTimeMinute} from "components/utils/time";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {createEffect, createSignal, onMount, VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {createLoginModal} from "../forms/login/login_modal";

const INITIAL_PAGE = "/";

/**
 * The login page.
 *
 * Possibly a temporary solution. The login modal can be displayed on top of any page, but it is
 * currently displayed as a separate page that triggers the modal on query error and redirects
 * otherwise.
 */
export default (() => {
  const navigate = useNavigate();
  const statusQuery = useQuery(User.statusQueryOptions);
  const systemStatusMonitor = useSystemStatusMonitor();
  const invalidate = useInvalidator();
  onMount(() => setActiveFacilityId(undefined));
  const loginModal = createLoginModal();
  createEffect(() => {
    if (systemStatusMonitor.needsReload()) {
      // If on the login screen, just reload without asking.
      location.reload();
    } else if (statusQuery.isError && !loginModal.isShown()) {
      loginModal.show({
        lightBackdrop: true,
        onSuccess: () => {
          invalidate.resetEverything();
          navigate(INITIAL_PAGE);
        },
      });
    } else if (statusQuery.isSuccess) {
      invalidate.resetEverything();
      navigate(INITIAL_PAGE);
    }
  });
  return (
    <>
      <LoginBackground />
      <QueryBarrier
        queries={[statusQuery]}
        ignoreCachedData
        // Do not show any errors, instead just show this login form.
        error={() => undefined}
        pending={() => undefined}
      >
        <MemoLoader />
      </QueryBarrier>
    </>
  );
}) satisfies VoidComponent;

function randomFrom<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

interface ScreenSaverProps {
  readonly class?: string;
  readonly paused?: boolean;
  readonly speedMult?: number;
}

const RandomWrights: VoidComponent<ScreenSaverProps> = (props) => {
  const levels = randomFrom([6, 7]);
  const houseSize = randomFrom([2, 3]);
  return <Wrights {...props} levels={levels} houseSize={houseSize} />;
};

const RandomMaurtue: VoidComponent<ScreenSaverProps> = (props) => {
  const maurCountMax = randomFrom([10, 20, 30]);
  const maurSpeedPxPerSec = randomFrom([70, 100, 130]);
  const headingDriftSigma = randomFrom([0.5, 1, 1.5, 2, 2.5, 3]);
  const pencilWidth = randomFrom([1, 1.5, 2]);
  const eraserWidth = randomFrom([0, 5, 10]);
  return (
    <Maurtue
      {...props}
      maurCountMax={maurCountMax}
      maurSpeedPxPerSec={maurSpeedPxPerSec}
      headingDriftSigma={headingDriftSigma}
      pencilWidth={pencilWidth}
      eraserWidth={eraserWidth}
    />
  );
};

const SCREEN_SAVERS = [
  {password: "\u0053\u0069\u0065\u0072\u0070\u0069\u0144\u0073\u006b\u0069", Component: RandomWrights},
  {password: "\u004D\u0061\u0075\u0072\u0074\u0075\u0065", Component: RandomMaurtue},
] as const;

const LoginBackground: VoidComponent = () => {
  const START_AFTER_MINUTES = 10;
  const [startTime, setStartTime] = createSignal(currentTimeMinute().plus({minutes: START_AFTER_MINUTES}));
  const [speedMult, setSpeedMult] = createSignal(1);
  const [saverIndex, setSaverIndex] = createSignal(Math.floor(Math.random() * SCREEN_SAVERS.length));
  useEventListener(document, "input", ({target}) => {
    if (target instanceof HTMLInputElement && target.type === "password") {
      const cmd = target.value;
      const matchedIndex = SCREEN_SAVERS.findIndex((s) => s.password === cmd);
      if (matchedIndex !== -1) {
        setSaverIndex(matchedIndex);
        setStartTime(currentTimeMinute());
        target.value = "";
      } else {
        const match = /^Speed:(\d{1,3})$/.exec(cmd);
        if (match) {
          setSpeedMult(Number(match[1]));
        }
      }
    }
  });
  return (
    <Dynamic
      component={SCREEN_SAVERS[saverIndex()]!.Component}
      class="fixed inset-0"
      paused={currentTimeMinute() < startTime()}
      speedMult={speedMult()}
    />
  );
};
