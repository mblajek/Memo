import {NON_NULLABLE} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {useSystemStatusMonitor} from "./system_status_monitor";

export function useEnvInfo() {
  const {status} = useSystemStatusMonitor();
  return {
    background: () => {
      const st = status();
      if (!st) {
        return undefined;
      }
      if (st.appEnvColor) {
        return st.appEnvColor;
      }
      if (st.appEnv === PROD_ENV_NAME && isDEV()) {
        return PROD_DEV_BG;
      }
      return undefined;
    },
    shortInfo: () => (status()?.appEnv === PROD_ENV_NAME ? undefined : status()?.appEnv),
    info: () => {
      const st = status();
      if (!st) {
        return undefined;
      }
      if (st.appEnv === PROD_ENV_NAME && !isDEV()) {
        return undefined;
      }
      return [st.appEnv, isDEV() ? "DEV" : undefined].filter(NON_NULLABLE).join(", ");
    },
  };
}

const PROD_ENV_NAME = "production";
const PROD_DEV_BG =
  "repeating-linear-gradient(-45deg, black 0, #aaa 1px 9px, black 10px, yellow 11px 19px, black 20px)";
