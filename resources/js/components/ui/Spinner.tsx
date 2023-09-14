import {ImSpinner2} from "solid-icons/im";
import {Component} from "solid-js";

/** The loading spinner used across the app. */
export const BigSpinner: Component = () => (
  <div class="flex justify-center items-center">
    <ImSpinner2 size={50} class="animate-spin m-4" />
  </div>
);
