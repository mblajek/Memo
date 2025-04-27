import {useNavigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {MemoLoader} from "components/ui/MemoLoader";
import {Wrights} from "components/ui/Wrights";
import {useEventListener} from "components/utils/event_listener";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {createEffect, createSignal, onMount, VoidComponent} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {createLoginModal} from "../forms/login/login_modal";
import {User} from "data-access/memo-api/groups/User";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {currentTimeMinute} from "components/utils/time";

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
  const statusQuery = createQuery(User.statusQueryOptions);
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

const LoginBackground: VoidComponent = () => {
  const START_AFTER_MINUTES = 10;
  const [startTime, setStartTime] = createSignal(currentTimeMinute().plus({minutes: START_AFTER_MINUTES}));
  const [speedMult, setSpeedMult] = createSignal(1);
  useEventListener(document, "input", ({target}) => {
    if (target instanceof HTMLInputElement && target.type === "password") {
      const cmd = target.value;
      if (cmd === "\u0053\u0069\u0065\u0072\u0070\u0069\u0144\u0073\u006b\u0069") {
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
  function randomFrom(arr: readonly number[]) {
    return arr[Math.floor(Math.random() * arr.length)]!;
  }
  const levels = randomFrom([6, 7]);
  const houseSize = randomFrom([2, 3]);
  return (
    <Wrights
      class="fixed inset-0"
      levels={levels}
      houseSize={houseSize}
      paused={currentTimeMinute() < startTime()}
      speedMult={speedMult()}
    />
  );
};
