import { Component, For, Show } from "solid-js";
import { createLocalSignal } from "utils/createLocalSignal";
import {
    HiOutlineBookOpen,
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineUser,
    HiSolidArrowCircleLeft,
    HiSolidArrowCircleRight,
} from "solid-icons/hi";
import { IconTypes } from "solid-icons";
import { A, AnchorProps } from "@solidjs/router";
import { Dynamic } from "solid-js/web";

export const Navbar: Component = () => {
    const [expanded, setExpanded] = createLocalSignal("expanded", false);

    return (
        <aside
            class="bg-gray-900 flex flex-col text-white transition-all"
            classList={{ "w-[250px]": expanded() }}
        >
            <div
                class="p-6 mb-8 flex flex-row items-center gap-3"
                classList={{
                    "justify-around": expanded(),
                    "justify-center": !expanded(),
                }}
            >
                <Show when={expanded()}>
                    <span>Memo</span>
                </Show>
                <HiOutlineBookOpen size="25" />
            </div>
            <nav class="flex-1 p-2">
                <For each={navbarItems}>
                    {(item, index) => (
                        <A
                            data-index={index()}
                            href={item.href}
                            class="mb-2 p-4 rounded-lg flex flex-row items-center gap-3 hover:bg-gray-700"
                            classList={{
                                "justify-start": expanded(),
                            }}
                            title={!expanded() ? item.title : undefined}
                            activeClass="bg-gray-600"
                        >
                            <item.Icon size="25" />
                            <Show when={expanded()}>
                                <span>{item.title}</span>
                            </Show>
                        </A>
                    )}
                </For>
            </nav>
            <div class="p-2 flex justify-center items-center">
                <button
                    class="p-4 rounded-lg flex flex-row justify-center items-center hover:bg-gray-700"
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    <Dynamic component={expandedIcon(expanded())} size="25" />
                </button>
            </div>
        </aside>
    );
};

const expandedIcon = (expanded: boolean): IconTypes => {
    if (expanded) return HiSolidArrowCircleLeft;
    return HiSolidArrowCircleRight;
};

type NavbarItem = {
    Icon: IconTypes;
    title: string;
    href: AnchorProps["href"];
};

const navbarItems: NavbarItem[] = [
    {
        title: "calendar",
        Icon: HiOutlineCalendar,
        href: "/dashboard/calendar",
    },
    {
        title: "schedule",
        Icon: HiOutlineClock,
        href: "/dashboard/schedule",
    },
    {
        title: "users",
        Icon: HiOutlineUser,
        href: "/dashboard/users",
    },
];
