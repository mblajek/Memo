import {createMutation, createQuery} from "@tanstack/solid-query";
import {DATE_TIME_WITH_WEEKDAY_FORMAT, currentTime, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api";
import {PasswordChangeForm} from "features/user-panel";
import {HiOutlineCheckCircle, HiOutlinePower, HiOutlineXCircle} from "solid-icons/hi";
import {TbPassword} from "solid-icons/tb";
import {Index, Match, Switch, VoidComponent} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";

export const UserInfo: VoidComponent = () => {
  const t = useLangFunc();
  const statusQuery = createQuery(User.statusQueryOptions);

  const invalidate = User.useInvalidator();
  const logout = createMutation(() => ({
    mutationFn: () => User.logout(),
    onSuccess() {
      invalidate.statusAndFacilityPermissions();
      setActiveFacilityId(undefined);
    },
  }));

  return (
    <div class="text-sm flex flex-row justify-between items-center gap-6">
      <div class="px-6 border-x-2 border-x-gray-200 flex flex-row justify-between items-center gap-2">
        <div>
          <Switch>
            <Match when={statusQuery.data?.permissions.verified}>
              <HiOutlineCheckCircle class="text-green-700" size="30" />
            </Match>
            <Match when={statusQuery.data?.permissions.unverified}>
              <div title={t("unverified_user")}>
                <HiOutlineXCircle class="text-red-500" size="30" />
              </div>
            </Match>
          </Switch>
        </div>
        <div class="flex flex-col justify-between items-stretch">
          <span>
            <Index
              // Display each part in a separate span to allow selecting the date.
              each={currentTime().toLocaleParts(DATE_TIME_WITH_WEEKDAY_FORMAT)}
            >
              {(item) => <span>{item().value}</span>}
            </Index>
          </span>
          <span>
            {statusQuery.data?.user.name}
            {/* This is a temporary location for the change password button. */}
            <button
              class="m-1"
              onClick={() => PasswordChangeForm.showModal()}
              title={t("forms.password_change.formName")}
            >
              <TbPassword />
            </button>
            <PasswordChangeForm.Modal />
          </span>
        </div>
      </div>
      <div class="flex justify-center items-center">
        <button
          class="rounded-lg flex flex-row justify-center items-center hover:bg-white"
          onClick={() => logout.mutate()}
          title={t("actions.log_out")}
        >
          <HiOutlinePower class="text-red-500" size="30" />
        </button>
      </div>
    </div>
  );
};
