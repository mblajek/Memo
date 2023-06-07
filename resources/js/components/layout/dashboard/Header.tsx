import { Trans } from "@mbarzda/solid-i18next";
import { Component } from "solid-js";
import toast from "solid-toast";

export const Header: Component = () => {
    return (
        <header class="bg-white py-2 px-5 flex flex-row gap-4 items-center sticky top-0">
            <img src="img/memo_logo.svg" class="h-14"></img>
            <img src="img/cpd_children_logo.svg" class="h-12"></img>
            <div class="flex-grow"></div>
            <div>Jan Nowak</div>
            <button
                onClick={notify}
                class="px-4 py-2 capitalize text-white text-lg bg-red-500 rounded-lg hover:bg-red-600"
            >
                <Trans key="log_out">Wyloguj się</Trans>
            </button>
        </header>
    );
};

const notify = () => {
  const id = "logoutToast";
  toast.success("Wylogowano pomyślnie", { id });
};
