import {SmallSpinner} from "components/ui/Spinner";
import {useLangFunc} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {JSX, Match, Show, Switch} from "solid-js";
import {useSystemStatusMonitor} from "./system_status_monitor";

export function useEnvInfo() {
  const t = useLangFunc();
  const status = useSystemStatusMonitor().baseStatus;
  return {
    style: (): Pick<JSX.CSSProperties, "background" | "color"> | undefined => {
      const st = status();
      if (!st) {
        return undefined;
      }
      const background = st.appEnvColor || (st.appEnv === PROD_ENV_NAME && isDEV() ? PROD_DEV_BG : undefined);
      const color = st.appEnvFgColor || undefined;
      return background || color ? {background, color} : undefined;
    },
    info: () => (
      <Show when={status()} fallback={<SmallSpinner />}>
        {(status) => (
          <Switch>
            <Match when={status().appEnv === PROD_ENV_NAME && !isDEV()}>{undefined}</Match>
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
