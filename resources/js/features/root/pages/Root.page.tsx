import {Button} from "components/ui/Button";
import {actionIcons} from "components/ui/icons";
import {AccessBarrier} from "components/utils/AccessBarrier";
import {createIdleDetector} from "components/utils/idle_detector";
import {useLangFunc} from "components/utils/lang";
import {useLogOut} from "components/utils/log_out";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {onMount, ParentComponent, Show, VoidComponent} from "solid-js";
import {Container} from "../layout/Container";
import {Header} from "../layout/Header";
import {Main} from "../layout/Main";
import {Navbar} from "../layout/Navbar";

const IDLE_LOGOUT_TIME_SECS = 8 * 3600;

export default ((props) => {
  const logOut = useLogOut();
  createIdleDetector({timeSecs: IDLE_LOGOUT_TIME_SECS, func: () => logOut.logOut()});
  return (
    <AccessBarrier>
      <SystemStatusUpdateNotification />
      <Container>
        <Navbar />
        <Header />
        <Main>{props.children}</Main>
      </Container>
    </AccessBarrier>
  );
}) satisfies ParentComponent;

const SystemStatusUpdateNotification: VoidComponent = () => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  return (
    <Show when={systemStatusMonitor.needsReload()}>
      <Button
        ref={(button) =>
          onMount(() =>
            button.animate([{}, {transform: "scale(1.1)"}], {
              direction: "alternate",
              duration: 1000,
              easing: "ease-in-out",
              iterations: Number.POSITIVE_INFINITY,
            }),
          )
        }
        class="
          absolute m-3 p-2 w-56 bg-yellow-200 dark:bg-yellow-400 border border-input-border
          rounded z-modal text-sm hover:text-memo-active flex items-stretch gap-1
        "
        style={{"transition-duration": "300ms"}}
        onClick={() => location.reload()}
      >
        <div class="flex items-center">
          <actionIcons.Reload size="24" class="text-current" />
        </div>
        <div class="text-black">{t("system_version_update")}</div>
      </Button>
    </Show>
  );
};
