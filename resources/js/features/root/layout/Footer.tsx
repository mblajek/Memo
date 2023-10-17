import {VoidComponent} from "solid-js";
import s from "./layout.module.scss";

export const Footer: VoidComponent = () => {
  return (
    <footer class={s.footer}>
      <div id="copyright">Copyright ©2023 nie mam pojęcia jak działa copyright</div>
      <div id="version">Memo Version: 0.1 Alpha</div>
    </footer>
  );
};
