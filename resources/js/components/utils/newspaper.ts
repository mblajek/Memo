import {createPersistence} from "components/persistence/persistence";
import {userStorageStorage} from "components/persistence/storage";
import {createCached} from "components/utils/cache";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {createSignal} from "solid-js";

type PersistentState = {
  readonly chAtVer: string | null;
};

export const useNewspaper = createCached(() => {
  const systemStatusMonitor = useSystemStatusMonitor();
  function getMajorMinorVer(ver: string | undefined) {
    return ver ? ver.split(".").slice(0, 2).join(".") : undefined;
  }
  const currentVer = () => getMajorMinorVer(systemStatusMonitor.baseStatus()?.version);
  const [readChangelogAtVer, setReadChangelogAtVer] = createSignal<string>();
  createPersistence<PersistentState>({
    value: () => ({
      chAtVer: readChangelogAtVer() || null,
    }),
    onLoad: (value) => {
      setReadChangelogAtVer(value.chAtVer || "-");
    },
    storage: userStorageStorage("newspaper"),
  });
  return {
    hasNews() {
      return currentVer() && readChangelogAtVer() && currentVer() !== readChangelogAtVer();
    },
    changelogHref() {
      if (!this.hasNews()) {
        return undefined;
      }
      return `/help/changelog#v${currentVer()}`;
    },
    reportNewsRead() {
      setReadChangelogAtVer(currentVer());
    },
  };
});
