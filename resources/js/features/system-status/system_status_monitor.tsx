import {createQuery} from "@tanstack/solid-query";
import {createCached} from "components/utils/cache";
import {System} from "data-access/memo-api/groups";
import {SystemStatusResource} from "data-access/memo-api/resources/SystemStatusResource";
import {createEffect, createSignal} from "solid-js";

export const useSystemStatusMonitor = createCached(() => {
  const [needsReload, setNeedsReload] = createSignal(false);
  const systemStatusQuery = createQuery(System.statusQueryOptions);
  let baseStatus: SystemStatusResource | undefined;
  const [lastStatus, setLastStatus] = createSignal<SystemStatusResource>();
  createEffect(() => {
    const status = systemStatusQuery.data;
    if (!baseStatus) {
      baseStatus = status;
      setLastStatus(status);
      return;
    }
    if (!status) {
      return;
    }
    if (needsRefresh(lastStatus()!, status)) {
      console.info("System version changed. Last status:", {...lastStatus()}, "Current status:", {...status});
      setNeedsReload(true);
    }
    setLastStatus(status);
  });
  return {baseStatus, status: lastStatus, needsReload};
});

function needsRefresh(prevStatus: SystemStatusResource, newStatus: SystemStatusResource) {
  return (["commitHash", "backendHash", "frontendHash"] as const).some((key) => prevStatus[key] !== newStatus[key]);
}
