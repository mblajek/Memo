import {A, AnchorProps, Location, useLocation, useParams} from "@solidjs/router";
import {FullLogo} from "components/ui";
import {IconTypes} from "solid-icons";
import {HiSolidInformationCircle, HiSolidUserGroup} from "solid-icons/hi";
import {For, Show, VoidComponent} from "solid-js";
import s from "./style.module.scss";

export const Navbar: VoidComponent = () => {
  const location = useLocation();
  const params = useParams<{facilityUrl?: string}>();

  return (
    <aside class={s.sidebar}>
      <FullLogo />
      <nav class="flex-1">
        <Show when={params.facilityUrl}>
          <For each={NAVBAR_ITEMS}>
            {(item) => (
              <A
                href={item.hrefFn({location, params})}
                class="mb-2 p-4 rounded-lg flex flex-row items-center gap-3 hover:bg-white"
                activeClass="bg-white"
              >
                <item.Icon size="25" />
                <span>{item.title}</span>
              </A>
            )}
          </For>
        </Show>
        <hr class="my-4" />
        <A
          href="/admin"
          class="mb-2 p-4 rounded-lg flex flex-row items-center gap-3 hover:bg-white"
          activeClass="bg-white"
        >
          <HiSolidUserGroup size="25" />
          <span>Administracja</span>
        </A>
        <A
          href="/help"
          class="mb-2 p-4 rounded-lg flex flex-row items-center gap-3 hover:bg-white"
          activeClass="bg-white"
        >
          <HiSolidInformationCircle size="25" />
          <span>Pomoc</span>
        </A>
      </nav>
    </aside>
  );
};

export type HrefFnArgs = {
  params: {facilityUrl?: string};
  location: Location;
};

export type NavbarItem = {
  Icon: IconTypes;
  hrefFn: (args: HrefFnArgs) => AnchorProps["href"];
  title: string;
};

const NAVBAR_ITEMS: NavbarItem[] = [
  {
    Icon: HiSolidUserGroup,
    hrefFn: ({params: {facilityUrl}}) => {
      if (facilityUrl) return `/${facilityUrl}/admin`;
      return "/help";
    },
    title: "Administracja placówki",
  },
];
