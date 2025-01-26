import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {useLangFunc} from "components/utils/lang";
import {Show, VoidComponent} from "solid-js";
import {useSystemStatusMonitor} from "./system_status_monitor";

export const BaseAppVersion: VoidComponent = () => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  return (
    <Show when={systemStatusMonitor.baseStatus()?.version} fallback={<EmptyValueSymbol />}>
      {(version) => <>{t("app_version", {version: version()})}</>}
    </Show>
  );
};

export const FullAppVersion: VoidComponent = () => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  return (
    <Show when={systemStatusMonitor.needsReload()} fallback={<BaseAppVersion />}>
      {t("app_version_needs_reload", {
        baseVersion: systemStatusMonitor.baseStatus()?.version,
        lastVersion: systemStatusMonitor.lastStatus()?.version,
      })}
    </Show>
  );
};
