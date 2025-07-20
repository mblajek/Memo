import {SmallSpinner} from "components/ui/Spinner";
import {isDEV} from "components/utils/dev_mode";
import {useLangFunc} from "components/utils/lang";
import {JSX, Match, Show, Switch} from "solid-js";
import {useDeveloperPermission} from "../authentication/developer_permission";
import {useSystemStatusMonitor} from "./system_status_monitor";

export function useEnvInfo() {
  const t = useLangFunc();
  const status = useSystemStatusMonitor().baseStatus;
  const developerPermission = useDeveloperPermission();
  const isDeveloper = () => isDEV() || developerPermission.enabled();
  return {
    appEnv: () => status()?.appEnv,
    isProd: () => status()?.appEnv === PROD_ENV_NAME,
    style: () => {
      const st = status();
      if (!st) {
        return undefined;
      }
      const background = st.appEnvColor || (st.appEnv === PROD_ENV_NAME && isDeveloper() ? PROD_DEV_BG : undefined);
      const color = st.appEnvFgColor || undefined;
      return background || color
        ? ({background, color} satisfies Pick<JSX.CSSProperties, "background" | "color">)
        : undefined;
    },
    faviconBadgeFill: () => {
      const st = status();
      if (!st || !st.appEnvColor) {
        return undefined;
      }
      // Return some color for long background, which might be e.g. `url(...)` which would not work.
      return st.appEnvColor.length > 30 ? "#bcbd" : st.appEnvColor;
    },
    info: () => (
      <Show when={status()} fallback={<SmallSpinner />}>
        {(status) => (
          <Switch>
            <Match when={status().appEnv === PROD_ENV_NAME && !isDeveloper()}>{undefined}</Match>
            <Match when="other">
              <span>
                {t("app_env", {env: status().appEnv})}
                <Show when={isDEV()}>, DEV</Show>
              </span>
            </Match>
          </Switch>
        )}
      </Show>
    ),
  };
}

const PROD_ENV_NAME = "production";
const PROD_DEV_BG =
  "repeating-linear-gradient(-45deg, black 0, #aaa 1px 9px, black 10px, yellow 11px 19px, black 20px)";
