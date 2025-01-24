import {useNavigate} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {actionIcons} from "components/ui/icons";
import {InfoIcon} from "components/ui/InfoIcon";
import {MemoLoader} from "components/ui/MemoLoader";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {CHECKBOX} from "components/ui/symbols";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {cx} from "components/utils/classnames";
import {isDEV, resetDEV, toggleDEV} from "components/utils/dev_mode";
import {DATE_TIME_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {usePasswordExpiration} from "components/utils/password_expiration";
import {currentTimeMinute} from "components/utils/time";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {useDeveloperPermission} from "features/authentication/developer_permission";
import {createPasswordChangeModal} from "features/user-panel/password_change_modal";
import {HiOutlineCheckCircle, HiOutlineXCircle, HiSolidWrenchScrewdriver} from "solid-icons/hi";
import {TiWarningOutline} from "solid-icons/ti";
import {DEV, Index, Match, Show, Switch, VoidComponent, createEffect, on} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {usesLocalTimeZone} from "time_zone_controller";
import {ThemeIcon, useThemeControl} from "../theme_control";

type _Directives = typeof title;

const FORMAT = {...DATE_TIME_FORMAT, second: undefined, weekday: "long"} satisfies Intl.DateTimeFormatOptions;

export const UserInfo: VoidComponent = () => {
  const t = useLangFunc();
  const navigate = useNavigate();
  const statusQuery = createQuery(User.statusQueryOptions);
  const passwordExpiration = usePasswordExpiration();
  const passwordChangeModal = createPasswordChangeModal();
  const {toggleTheme} = useThemeControl();
  const invalidate = useInvalidator();
  const developerPermission = useDeveloperPermission();
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

  createEffect(
    on(passwordExpiration, (expiration, prevExpiration) => {
      if (expiration && expiration !== prevExpiration) {
        passwordChangeModal.show();
      }
    }),
  );

  const CurrentTime: VoidComponent = () => {
    return (
      <div class={cx("text-nowrap", usesLocalTimeZone() ? undefined : "text-orange-600")}>
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
          <div class="flex gap-1 items-center text-nowrap">
            {statusQuery.data?.user.name}
            <Show when={developerPermission.enabled()}>
              <PopOver
                trigger={(popOver) => (
                  <Button title="Developer permission" onClick={popOver.open}>
                    <HiSolidWrenchScrewdriver class="text-current" />
                  </Button>
                )}
              >
                {(popOver) => (
                  <SimpleMenu>
                    <Button
                      onClick={() => {
                        popOver.close();
                        developerPermission.enable(false);
                      }}
                    >
                      Developer logout
                    </Button>
                  </SimpleMenu>
                )}
              </PopOver>
            </Show>
            <PopOver
              trigger={(popOver) => (
                <Button title={t("user_settings")} onClick={popOver.open}>
                  <actionIcons.ThreeDotsBig class="text-current inlineIcon" />
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
                  <Show when={DEV || isDEV() || developerPermission.enabled()}>
                    <Button class="flex gap-2 items-center justify-between" onClick={() => toggleDEV()}>
                      {CHECKBOX(isDEV())} DEV mode
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
