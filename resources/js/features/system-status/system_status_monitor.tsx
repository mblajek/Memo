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
    if (status.commitHash !== lastStatus()!.commitHash) {
      console.info(`System version changed. Commit hash: ${lastStatus()?.commitHash} -> ${status.commitHash}`);
      setNeedsReload(true);
    }
    setLastStatus(status);
  });
  return {baseStatus, status: lastStatus, needsReload};
});
