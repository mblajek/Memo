import {useLocation, useNavigate, useParams} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {Button} from "components/ui";
import {DATE_TIME_WITH_WEEKDAY_FORMAT, QueryBarrier, useCurrentTime, useLangFunc} from "components/utils";
import {System, User} from "data-access/memo-api";
import {PasswordChangeForm} from "features/user-panel";
import {HiOutlineCheckCircle, HiOutlinePower, HiOutlineXCircle} from "solid-icons/hi";
import {TbPassword} from "solid-icons/tb";
import {For, Index, Match, Switch, VoidComponent} from "solid-js";
import s from "./style.module.scss";

export const Header: VoidComponent = () => {
  return (
    <header class={s.header}>
      <div class="flex-grow" />
      <FacilitySelect />
      <HeaderRight />
    </header>
  );
};

const FacilitySelect: VoidComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{facilityUrl: string}>();

  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);

  return (
    <QueryBarrier queries={[facilitiesQuery]} pendingElement={null}>
      <select
        class="mr-4"
        value={params.facilityUrl}
        onChange={(e) => {
          if (params.facilityUrl) {
            const newPathname = location.pathname.split(params.facilityUrl).join(e.target.value);
            navigate(newPathname);
          } else {
            navigate(`/${e.target.value}`);
          }
        }}
      >
        <For each={facilitiesQuery.data}>{(facility) => <option value={facility.url}>{facility.name}</option>}</For>
      </select>
    </QueryBarrier>
  );
};

const HeaderRight = () => {
  const t = useLangFunc();
  const currentTime = useCurrentTime();
  const statusQuery = createQuery(() => User.statusQueryOptions);

  const invalidateUser = User.useInvalidator();
  const logout = createMutation(() => ({
    mutationFn: User.logout,
    onSuccess() {
      invalidateUser.status();
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
              <HiOutlineXCircle class="text-red-500" size="30" />
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
          </span>
        </div>
      </div>
      <div class="flex justify-center items-center">
        <Button
          class="rounded-lg flex flex-row justify-center items-center hover:bg-white"
          onClick={() => logout.mutate()}
          title={t("actions.log_out")}
        >
          <HiOutlinePower class="text-red-500" size="30" />
        </Button>
      </div>
      <PasswordChangeForm.Modal />
    </div>
  );
};
