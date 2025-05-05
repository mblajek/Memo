import {useQuery} from "@tanstack/solid-query";
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
import {isDEV, toggleDEV} from "components/utils/dev_mode";
import {DATE_TIME_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {useLogOut} from "components/utils/log_out";
import {usePasswordExpirationDays} from "components/utils/password_expiration";
import {currentTimeMinute} from "components/utils/time";
import {User} from "data-access/memo-api/groups/User";
import {useDeveloperPermission} from "features/authentication/developer_permission";
import {createPasswordChangeModal} from "features/user-panel/password_change_modal";
import {HiOutlineCheckCircle, HiOutlineXCircle, HiSolidWrenchScrewdriver} from "solid-icons/hi";
import {TiWarningOutline} from "solid-icons/ti";
import {DEV, Index, Show, VoidComponent, createEffect, on} from "solid-js";
import {usesLocalTimeZone} from "time_zone_controller";
import {ThemeIcon, useThemeControl} from "../theme_control";

type _Directives = typeof title;

const FORMAT = {...DATE_TIME_FORMAT, second: undefined, weekday: "long"} satisfies Intl.DateTimeFormatOptions;

const PASSWORD_EXPIRATION_DAYS_SUGGEST_CHANGE = 20;
const PASSWORD_EXPIRATION_DAYS_FORCE_CHANGE = 7;

export const UserInfo: VoidComponent = () => {
  const t = useLangFunc();
  const statusQuery = useQuery(User.statusQueryOptions);
  const passwordExpirationDays = usePasswordExpirationDays();
  const passwordChangeModal = createPasswordChangeModal();
  const {toggleTheme} = useThemeControl();
  const developerPermission = useDeveloperPermission();
  const logOut = useLogOut();
  const suggestPasswordChange = () => passwordExpirationDays() <= PASSWORD_EXPIRATION_DAYS_SUGGEST_CHANGE;

  createEffect(
    on(suggestPasswordChange, (suggestChange) => {
      if (suggestChange && !passwordChangeModal.isShown()) {
        passwordChangeModal.show({
          expirationSoon: true,
          forceChange: passwordExpirationDays() <= PASSWORD_EXPIRATION_DAYS_FORCE_CHANGE,
        });
      }
    }),
  );

  const CurrentTime: VoidComponent = () => {
    return (
      <div class={cx("text-nowrap", usesLocalTimeZone() ? undefined : "bg-white px-0.5 rounded text-orange-700")}>
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
          <Show
            when={statusQuery.data?.permissions.verified}
            fallback={
              <div use:title={t("unverified_user")}>
                <HiOutlineXCircle class="text-red-500" size="30" />
              </div>
            }
          >
            <div use:title={t("verified_user")}>
              <HiOutlineCheckCircle class="text-memo-active" size="30" />
            </div>
          </Show>
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
                        void developerPermission.enable(false);
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
                <Button class="p-0.5 flex items-center gap-0.5" title={t("user_settings")} onClick={popOver.open}>
                  <actionIcons.ThreeDots class="text-current" />
                  <Show when={suggestPasswordChange()}>
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
                      passwordChangeModal.show({expirationSoon: suggestPasswordChange()});
                    }}
                  >
                    {t("actions.change_password")}
                    <Show when={suggestPasswordChange()}>
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
                  <Button onClick={() => logOut.logOut()}>{t("actions.log_out")}</Button>
                </SimpleMenu>
              )}
            </PopOver>
          </div>
        </div>
      </div>
      <Show when={logOut.mutation.isPending}>
        <MemoLoader />
      </Show>
    </div>
  );
};
