import {createMutation, createQuery} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {MemoLoader} from "components/ui/MemoLoader";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {DATE_TIME_FORMAT, currentTime, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {createPasswordChangeModal} from "features/user-panel/password_change_modal";
import {HiOutlineCheckCircle, HiOutlineXCircle} from "solid-icons/hi";
import {TbPassword} from "solid-icons/tb";
import {Index, Match, Show, Switch, VoidComponent} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";

export const UserInfo: VoidComponent = () => {
  const t = useLangFunc();
  const statusQuery = createQuery(User.statusQueryOptions);
  const passwordChangeModal = createPasswordChangeModal();

  const invalidate = useInvalidator();
  const logout = createMutation(() => ({
    mutationFn: () => User.logout(),
    meta: {
      isFormSubmit: true,
    },
    onSuccess() {
      setActiveFacilityId(undefined);
      // Invalidate as the last operation to avoid starting unnecessary queries that are later cancelled.
      invalidate.userStatusAndFacilityPermissions();
    },
  }));

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
              <SimpleMenu
                items={[
                  {label: t("actions.change_password"), onClick: () => passwordChangeModal.show()},
                  {label: t("actions.log_out"), onClick: () => logout.mutate()},
                ]}
              />
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
