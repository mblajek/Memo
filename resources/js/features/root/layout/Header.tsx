import {useLocation, useNavigate, useParams} from "@solidjs/router";
import {createMutation, useQueryClient} from "@tanstack/solid-query";
import cx from "classnames";
import {QueryBarrier} from "components/utils";
import {DATE_TIME_WITH_WEEKDAY_FORMAT} from "components/utils/formatting";
import {System, User} from "data-access/memo-api";
import {HiOutlineCheckCircle, HiOutlinePower, HiOutlineXCircle} from "solid-icons/hi";
import {Component, For, Match, Switch, createEffect, createSignal, onMount} from "solid-js";
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

  const facilitiesQuery = System.useFacilitiesList();

  createEffect(() => console.log(params.facilityUrl));

  return (
    <QueryBarrier query={facilitiesQuery} loadingElement={null}>
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
          {(facility, index) => (
            <option data-index={index()} value={facility.url}>
              {facility.name}
            </option>
          )}
        </For>
      </select>
    </QueryBarrier>
  );
};

const HeaderRight = () => {
  const currentTime = useCurrentDate();
  const statusQuery = User.useStatus({meta: {quietError: true}});

  const queryClient = useQueryClient();
  const logout = createMutation({
    mutationFn: User.logout,
    onSuccess() {
      queryClient.invalidateQueries(User.keys.status());
    },
  });

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
            {/* Display each part in a separate span to allow selecting the date. */}
            <For each={
              DATE_TIME_WITH_WEEKDAY_FORMAT.formatToParts(currentTime()).map(({value}) => value)}>
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
          title="Wyloguj się"
        >
          <HiOutlinePower color="red" size="30" />
        </button>
      </div>
    </div>
  );
};

const useCurrentDate = () => {
  const [currentDate, setCurrentDate] = createSignal(new Date());
  onMount(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  });
  return currentDate;
};
