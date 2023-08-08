import {Component} from "solid-js";
import {CopyToClipboard} from "./CopyToClipboard";

interface Props {
  email: string;
}

/** A component for displaying a copyiable email address. No mailto. */
export const Email: Component<Props> = (props) => (
  <span>
    {props.email} <CopyToClipboard text={props.email} />
  </span>
);
