import {createMutation, createQuery, useQueryClient} from "@tanstack/solid-query";
import {DATE_TIME_WITH_WEEKDAY_FORMAT, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api";
import {PasswordChangeForm} from "features/user-panel";
import {DateTime} from "luxon";
import {HiOutlineCheckCircle, HiOutlinePower, HiOutlineXCircle} from "solid-icons/hi";
import {TbPassword} from "solid-icons/tb";
import {Match, Switch, createSignal, onMount, Index, onCleanup} from "solid-js";

export const UserInfo = () => {
  const t = useLangFunc();
  const currentTime = useCurrentTime();
  const statusQuery = createQuery(() => User.statusQueryOptions());

  const queryClient = useQueryClient();
  const logout = createMutation(() => ({
    mutationFn: User.logout,
    onSuccess() {
      queryClient.invalidateQueries({queryKey: User.keys.status()});
    },
  }));

  return (
    <div class="text-sm flex flex-row justify-between items-center gap-6">
      <div class="px-6 border-x-2 border-x-gray-200 flex flex-row justify-between items-center gap-2">
        <div>
          <Switch>
            <Match when={statusQuery.data?.permissions.verified}>
              <HiOutlineCheckCircle color="green" size="30" />
            </Match>
            <Match when={statusQuery.data?.permissions.unverified}>
              <HiOutlineXCircle color="red" size="30" />
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
            <button class="m-1" onClick={() => PasswordChangeForm.showModal()} title={t("forms.password_change.name")}>
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
          <HiOutlinePower color="red" size="30" />
        </button>
      </div>
    </div>
  );
};

const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = createSignal(DateTime.now());
  let interval: ReturnType<typeof setInterval>;
  onMount(() => {
    interval = setInterval(() => setCurrentTime(DateTime.now()), 1000);
  });
  onCleanup(() => clearInterval(interval));
  return currentTime;
};
