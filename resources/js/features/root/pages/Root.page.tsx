import {Button} from "components/ui/Button";
import {AccessBarrier, useLangFunc} from "components/utils";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {ParentComponent, Show, VoidComponent} from "solid-js";
import {Container} from "../layout/Container";
import {Header} from "../layout/Header";
import {Main} from "../layout/Main";
import {Navbar} from "../layout/Navbar";

interface Props {
  readonly facilityUrl?: string;
}

export default ((props) => {
  return (
    <AccessBarrier facilityUrl={props.facilityUrl}>
      <SystemStatusUpdateNotification />
      <Container>
        <Navbar />
        <Header />
        <Main>{props.children}</Main>
      </Container>
    </AccessBarrier>
  );
}) satisfies ParentComponent<Props>;

const SystemStatusUpdateNotification: VoidComponent = () => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  return (
    <Show when={systemStatusMonitor.needsReload()}>
      <Button
        class="absolute m-3 p-2 w-48 bg-yellow-200 border border-input-border rounded z-modal animate-bounce"
        onClick={() => location.reload()}
      >
        {t("system_version_update")}
      </Button>
    </Show>
  );
};
