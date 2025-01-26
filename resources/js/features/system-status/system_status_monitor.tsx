import {createQuery} from "@tanstack/solid-query";
import {createCached} from "components/utils/cache";
import {System} from "data-access/memo-api/groups/System";
import {SystemStatusResource} from "data-access/memo-api/resources/SystemStatusResource";
import {createEffect, createSignal} from "solid-js";

export const useSystemStatusMonitor = createCached(() => {
  const [needsReload, setNeedsReload] = createSignal(false);
  const systemStatusQuery = createQuery(System.statusQueryOptions);
  const [baseStatus, setBaseStatus] = createSignal<SystemStatusResource>();
  const [lastStatus, setLastStatus] = createSignal<SystemStatusResource>();
  createEffect(() => {
    const status = systemStatusQuery.data;
    if (!baseStatus()) {
      setBaseStatus(status);
      setLastStatus(status);
      return;
    }
    if (!status) {
      return;
    }
    if (status.version !== lastStatus()!.version || status.commitHash !== lastStatus()!.commitHash) {
      console.info(
        `System version changed. Version: ${lastStatus()?.version} -> ${status.version}, commit hash: ${lastStatus()?.commitHash} -> ${status.commitHash}`,
      );
      setNeedsReload(true);
    }
    setLastStatus(status);
  });
  return {baseStatus, lastStatus, needsReload};
});
