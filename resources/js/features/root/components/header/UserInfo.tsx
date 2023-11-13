import {createMutation, createQuery} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {DATE_TIME_WITH_WEEKDAY_FORMAT, currentTime, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api/groups";
import {HeaderSeparator} from "features/root/layout/HeaderSeparator";
import {PasswordChangeForm} from "features/user-panel/PasswordChange.form";
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
      setActiveFacilityId(undefined);
      // Invalidate as the last operation to avoid starting unnecessary queries that are later cancelled.
      invalidate.statusAndFacilityPermissions();
    },
  }));

  return (
    <div class="pr-2 text-sm flex flex-row justify-between items-center gap-4">
      <div class="flex flex-row justify-between items-center gap-2">
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
            <Button
              class="m-1"
              onClick={() => PasswordChangeForm.showModal()}
              title={t("forms.password_change.formName")}
            >
              <TbPassword />
            </Button>
            <PasswordChangeForm.PasswordChangeModal />
          </span>
        </div>
      </div>
      <HeaderSeparator />
      <div class="flex justify-center items-center">
        <Button
          class="rounded-lg flex flex-row justify-center items-center hover:bg-white"
          onClick={() => logout.mutate()}
          title={t("actions.log_out")}
        >
          <HiOutlinePower class="text-red-500" size="30" />
        </Button>
      </div>
    </div>
  );
};
