import { useTransContext } from "@mbarzda/solid-i18next";
import { useLocation, useNavigate, useParams } from "@solidjs/router";
import {
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import cx from "classnames";
import { QueryBarrier } from "components/utils";
import { System, User } from "data-access/memo-api";
import {
  HiOutlineCheckCircle,
  HiOutlinePower,
  HiOutlineXCircle,
} from "solid-icons/hi";
import { Component, For, Match, Switch, createSignal, onMount } from "solid-js";
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
  const params = useParams<{ facilityUrl: string }>();

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
  const [t] = useTransContext();
  const currentTime = useCurrentDate();
  const statusQuery = createQuery(() => User.statusQueryOptions);

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
          <span>{statusQuery.data?.user.email}</span>
        </div>
      </div>
      <div class="flex justify-center items-center">
        <button
          class="rounded-lg flex flex-row justify-center items-center hover:bg-white"
          onClick={() => logout.mutate()}
          title={t("log_out") || undefined}
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
