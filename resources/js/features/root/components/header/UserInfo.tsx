import {createMutation, createQuery} from "@tanstack/solid-query";
import * as popover from "@zag-js/popover";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {Button} from "components/ui/Button";
import {MemoLoader} from "components/ui/MemoLoader";
import {DATE_TIME_FORMAT, currentTime, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api/groups";
import {PasswordChangeForm} from "features/user-panel/PasswordChange.form";
import {HiOutlineCheckCircle, HiOutlineXCircle} from "solid-icons/hi";
import {TbPassword} from "solid-icons/tb";
import {Index, Match, Show, Switch, VoidComponent, createMemo, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import {setActiveFacilityId} from "state/activeFacilityId.state";

export const UserInfo: VoidComponent = () => {
  const t = useLangFunc();
  const statusQuery = createQuery(User.statusQueryOptions);

  const invalidate = User.useInvalidator();
  const logout = createMutation(() => ({
    mutationFn: () => User.logout(),
    meta: {
      isFormSubmit: true,
    },
    onSuccess() {
      setActiveFacilityId(undefined);
      // Invalidate as the last operation to avoid starting unnecessary queries that are later cancelled.
      invalidate.statusAndFacilityPermissions();
    },
  }));

  const [state, send] = useMachine(
    popover.machine({
      portalled: true,
      id: createUniqueId(),
      positioning: {
        gutter: 1,
        strategy: "absolute",
        placement: "bottom-end",
      },
    }),
  );
  const menuApi = createMemo(() => popover.connect(state, send, normalizeProps));

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
            <Button title={t("user_settings")} {...menuApi().triggerProps}>
              <TbPassword class="inlineIcon" />
            </Button>
            <Portal>
              <Show when={menuApi().isOpen}>
                <div
                  class="bg-white border border-gray-700 rounded shadow-xl overflow-clip flex flex-col"
                  {...menuApi().positionerProps}
                >
                  <div class="flex flex-col items-stretch" {...menuApi().contentProps}>
                    <Button class="px-2 py-1 text-left hover:bg-hover" onClick={() => PasswordChangeForm.showModal()}>
                      {t("actions.change_password")}
                    </Button>
                    <Button class="px-2 py-1 text-left hover:bg-hover" onClick={() => logout.mutate()}>
                      {t("actions.log_out")}
                    </Button>
                  </div>
                </div>
              </Show>
            </Portal>
          </div>
        </div>
      </div>
      <PasswordChangeForm.PasswordChangeModal />
      <Show when={logout.isPending}>
        <MemoLoader />
      </Show>
    </div>
  );
};
