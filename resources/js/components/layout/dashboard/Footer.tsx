import { Component } from "solid-js";

export const Footer: Component = () => {
    return (
        <footer class="py-4 px-6 bg-gray-300 flex flex-row justify-between items-center text-gray-500">
            <div id="copyright">
                Copyright ©2023 nie mam pojęcia jak działa copyright
            </div>
            <div id="version">Memo Version: 0.0 Alpha</div>
        </footer>
    );
};
