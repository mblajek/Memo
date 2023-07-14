import {useLocation, useNavigate, useParams} from "@solidjs/router";
import {createMutation, createQuery, useQueryClient} from "@tanstack/solid-query";
import {DATE_TIME_WITH_WEEKDAY_FORMAT, QueryBarrier, cx, useLangFunc} from "components/utils";
import {System, User} from "data-access/memo-api";
import {HiOutlineCheckCircle, HiOutlinePower, HiOutlineXCircle} from "solid-icons/hi";
import {Component, For, Match, Switch, createSignal, onMount} from "solid-js";
import s from "./style.module.scss";

export const Header: Component = () => {
  return (
    <header class={cx(s.header)}>
      <div class="flex-grow" />
      <FacilitySelect />
      <HeaderRight />
    </header>
  );
};

const FacilitySelect: Component = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{facilityUrl: string}>();

  const facilitiesQuery = createQuery(() => System.facilitiesQueryOptions);

  return (
    <QueryBarrier queries={[facilitiesQuery]} pendingElement={null}>
      <select
        class="mr-4"
        value={params.facilityUrl}
        onChange={(e) => {
          if (params.facilityUrl) {
            const newPathname = location.pathname
              .split(params.facilityUrl)
              .join(e.target.value);
            navigate(newPathname);
          } else {
            navigate(`/${e.target.value}`);
          }
        }}
      >
        <For each={facilitiesQuery.data}>
          {(facility) => <option value={facility.url}>{facility.name}</option>}
        </For>
      </select>
    </QueryBarrier>
  );
};

const HeaderRight = () => {
  const t = useLangFunc();
  const currentTime = useCurrentTime();
  const statusQuery = createQuery(() => User.statusQueryOptions);

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
            <For each={
              // Display each part in a separate span to allow selecting the date.
              DATE_TIME_WITH_WEEKDAY_FORMAT.formatToParts(currentTime())
                // This mapping must happen here, otherwise the identity of the elements
                // change every second, which is what we want to avoid.
                .map(({value}) => value)}>
              {value => <span>{value}</span>}
            </For>
          </span>
          <span>{statusQuery.data?.user.email}</span>
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
