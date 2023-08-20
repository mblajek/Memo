import {
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { getLangFunc } from "components/utils";
import { User } from "data-access/memo-api";
import {
  HiOutlineCheckCircle,
  HiOutlinePower,
  HiOutlineXCircle,
} from "solid-icons/hi";
import { Match, Switch, createSignal, onMount } from "solid-js";

export const UserInfo = () => {
  const t = getLangFunc();
  const currentTime = useCurrentTime();
  const statusQuery = createQuery(() => User.statusQueryOptions());

  const queryClient = useQueryClient();
  const logout = createMutation(() => ({
    mutationFn: User.logout,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: User.keys.status() });
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
          <span>{currentTime().toLocaleString()}</span>
          <span>{statusQuery.data?.user.name}</span>
        </div>
      </div>
      <div class="flex justify-center items-center">
        <button
          class="rounded-lg flex flex-row justify-center items-center hover:bg-white"
          onClick={() => logout.mutate()}
          title={t("log_out")}
        >
          <HiOutlinePower color="red" size="30" />
        </button>
      </div>
    </div>
  );
};

const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = createSignal(new Date());
  onMount(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  });
  return currentTime;
};
