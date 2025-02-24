import {Button} from "components/ui/Button";
import {AccessBarrier} from "components/utils/AccessBarrier";
import {createIdleDetector} from "components/utils/idle_detector";
import {useLangFunc} from "components/utils/lang";
import {useLogOut} from "components/utils/log_out";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {ParentComponent, Show, VoidComponent} from "solid-js";
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
        class="absolute m-3 p-2 w-48 bg-yellow-200 dark:bg-yellow-400 border border-input-border rounded z-modal animate-bounce"
        onClick={() => location.reload()}
      >
        {t("system_version_update")}
      </Button>
    </Show>
  );
};
