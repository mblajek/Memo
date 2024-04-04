import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {VoidComponent} from "solid-js";

export default (() => {
  const systemStatusMonitor = useSystemStatusMonitor();
  return <div class="p-2 wrapTextAnywhere">{JSON.stringify(systemStatusMonitor.status())}</div>;
}) satisfies VoidComponent;
