import {useNavigate} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {InfoIcon} from "components/ui/InfoIcon";
import {MemoLoader} from "components/ui/MemoLoader";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {CHECKBOX} from "components/ui/symbols";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {DATE_TIME_FORMAT, currentTimeMinute, useLangFunc} from "components/utils";
import {isDEV, resetDEV, toggleDEV} from "components/utils/dev_mode";
import {usePasswordExpiration} from "components/utils/password_expiration";
import {User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {createPasswordChangeModal} from "features/user-panel/password_change_modal";
import {HiOutlineCheckCircle, HiOutlineXCircle} from "solid-icons/hi";
import {TbPassword} from "solid-icons/tb";
import {TiWarningOutline} from "solid-icons/ti";
import {DEV, Index, Match, Show, Switch, VoidComponent, createEffect, createMemo, on} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {usesLocalTimeZone} from "time_zone_controller";
import {ThemeIcon, useThemeControl} from "../theme_control";

type _Directives = typeof title;

interface WindowWithDeveloperLogin {
  developerLogin(developer: boolean): void;
}

const FORMAT = {...DATE_TIME_FORMAT, second: undefined, weekday: "long"} satisfies Intl.DateTimeFormatOptions;

export const UserInfo: VoidComponent = () => {
  const t = useLangFunc();
  const navigate = useNavigate();
  const statusQuery = createQuery(User.statusQueryOptions);
  const passwordExpiration = usePasswordExpiration();
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
        invalidate.userStatusAndFacilityPermissions({clearCache: true});
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
            console.log(developer ? "Developer login success." : "Developer logout success.");
          })();
        };
      }
    }
  });

  createEffect(
    on(passwordExpiration, (expiration, prevExpiration) => {
      if (expiration && expiration !== prevExpiration) {
        passwordChangeModal.show();
      }
    }),
  );

  const CurrentTime: VoidComponent = () => {
    return (
      <div class={usesLocalTimeZone() ? undefined : "text-orange-600"}>
        <Index
          // Display each part in a separate span to allow selecting the date.
          each={currentTimeMinute().toLocaleParts(FORMAT)}
        >
          {(item) => <span>{item().value}</span>}
        </Index>
        <Show when={!usesLocalTimeZone()}>
          {" "}
          <span use:title={t("calendar.nonlocal_time_zone")}>
            <TiWarningOutline class="inlineIcon" />
          </span>
        </Show>
      </div>
    );
  };

  return (
    <div class="pr-2 text-sm flex justify-between items-center gap-4">
      <div class="flex justify-between items-center gap-2">
        <div>
          <Switch>
            <Match when={statusQuery.data?.permissions.verified}>
              <div use:title={t("verified_user")}>
                <HiOutlineCheckCircle class="text-memo-active" size="30" />
              </div>
            </Match>
            <Match when={statusQuery.data?.permissions.unverified}>
              <div use:title={t("unverified_user")}>
                <HiOutlineXCircle class="text-red-500" size="30" />
              </div>
            </Match>
          </Switch>
        </div>
        <div class="flex flex-col justify-between items-stretch">
          <CurrentTime />
          <div class="flex gap-1">
            {statusQuery.data?.user.name}
            <PopOver
              trigger={(popOver) => (
                <Button title={[t("user_settings"), {hideOnClick: true}]} onClick={popOver.open}>
                  <TbPassword class="inlineIcon" />
                  <Show when={passwordExpiration()}>
                    <WarningMark />
                  </Show>
                </Button>
              )}
            >
              {(popOver) => (
                <SimpleMenu>
                  <Button
                    onClick={() => {
                      popOver.close();
                      passwordChangeModal.show();
                    }}
                  >
                    {t("actions.change_password")}
                    <Show when={passwordExpiration()}>
                      <WarningMark />
                    </Show>
                  </Button>
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
              )}
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
