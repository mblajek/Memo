import {useNavigate} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {InfoIcon} from "components/ui/InfoIcon";
import {MemoLoader} from "components/ui/MemoLoader";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {CHECKBOX} from "components/ui/symbols";
import {DATE_TIME_FORMAT, currentTime, useLangFunc} from "components/utils";
import {isDEV, resetDEV, toggleDEV} from "components/utils/dev_mode";
import {User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {createPasswordChangeModal} from "features/user-panel/password_change_modal";
import {HiOutlineCheckCircle, HiOutlineXCircle} from "solid-icons/hi";
import {TbPassword} from "solid-icons/tb";
import {DEV, Index, Match, Show, Switch, VoidComponent, createEffect, createMemo} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {ThemeIcon, useThemeControl} from "../theme_control";

interface WindowWithDeveloperLogin {
  developerLogin(developer: boolean): void;
}

export const UserInfo: VoidComponent = () => {
  const t = useLangFunc();
  const navigate = useNavigate();
  const statusQuery = createQuery(User.statusQueryOptions);
  const passwordChangeModal = createPasswordChangeModal();
  const {toggleTheme} = useThemeControl();

  const invalidate = useInvalidator();
  const logout = createMutation(() => ({
    mutationFn: () => User.logout(),
    meta: {
      isFormSubmit: true,
    },
    onSuccess() {
      navigate("/");
      setTimeout(() => {
        resetDEV();
        setActiveFacilityId(undefined);
        // Invalidate as the last operation to avoid starting unnecessary queries that are later cancelled.
        invalidate.userStatusAndFacilityPermissions();
      });
    },
  }));
  const developerLogin = createMutation(() => ({
    mutationFn: User.developerLogin,
    onSuccess() {
      invalidate.userStatusAndFacilityPermissions();
    },
  }));

  const isGlobalAdmin = createMemo(() => statusQuery.data?.permissions.globalAdmin);
  createEffect(() => {
    if (isGlobalAdmin()) {
      const windowWithDeveloperLogin = window as unknown as WindowWithDeveloperLogin;
      if (!windowWithDeveloperLogin.developerLogin) {
        // eslint-disable-next-line no-console
        console.debug("Call developerLogin(true) to gain developer permission.");
        windowWithDeveloperLogin.developerLogin = (developer) => {
          (async () => {
            if (typeof developer !== "boolean") {
              throw new Error("Expected boolean argument");
            }
            await developerLogin.mutateAsync({developer});
            toggleDEV(developer);
            // eslint-disable-next-line no-console
            console.debug(developer ? "Developer login success." : "Developer logout success.");
          })();
        };
      }
    }
  });

  return (
    <div class="pr-2 text-sm flex justify-between items-center gap-4">
      <div class="flex justify-between items-center gap-2">
        <div>
          <Switch>
            <Match when={statusQuery.data?.permissions.verified}>
              <div title={t("verified_user")}>
                <HiOutlineCheckCircle class="text-memo-active" size="30" />
              </div>
            </Match>
            <Match when={statusQuery.data?.permissions.unverified}>
              <div title={t("unverified_user")}>
                <HiOutlineXCircle class="text-red-500" size="30" />
              </div>
            </Match>
          </Switch>
        </div>
        <div class="flex flex-col justify-between items-stretch">
          <div>
            <Index
              // Display each part in a separate span to allow selecting the date.
              each={currentTime().toLocaleParts({...DATE_TIME_FORMAT, weekday: "long"})}
            >
              {(item) => <span>{item().value}</span>}
            </Index>
          </div>
          <div class="flex gap-1">
            {statusQuery.data?.user.name}
            <PopOver
              trigger={(triggerProps) => (
                <Button title={t("user_settings")} {...triggerProps()}>
                  <TbPassword class="inlineIcon" />
                </Button>
              )}
            >
              <SimpleMenu>
                <Button onClick={() => passwordChangeModal.show()}>{t("actions.change_password")}</Button>
                <Button onClick={toggleTheme}>
                  {t("switch_theme")} <ThemeIcon class="inlineIcon" />
                </Button>
                <Show when={DEV || isDEV() || statusQuery.data?.permissions.developer}>
                  <Button class="flex gap-2 items-center justify-between" onClick={() => toggleDEV()}>
                    <div class="flex flex-col">
                      <span>{CHECKBOX(isDEV())} DEV mode</span>
                      <Show when={statusQuery.data?.permissions.developer}>
                        <span class="text-sm text-grey-text">Developer permission</span>
                      </Show>
                    </div>
                    <InfoIcon href="/help/dev/developer-modes" />
                  </Button>
                </Show>
                <Button onClick={() => logout.mutate()}>{t("actions.log_out")}</Button>
              </SimpleMenu>
            </PopOver>
          </div>
        </div>
      </div>
      <Show when={logout.isPending}>
        <MemoLoader />
      </Show>
    </div>
  );
};
