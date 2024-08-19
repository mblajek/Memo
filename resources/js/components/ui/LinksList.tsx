import {A} from "@solidjs/router";
import {VoidComponent} from "solid-js";
import {ThingsList} from "./ThingsList";

interface Props {
  readonly links: readonly string[];
}

export const LinksList: VoidComponent<Props> = (props) => {
  return (
    <div class="text-sm">
      <ThingsList
        things={props.links}
        map={(link) => (
          <A href={link} target="_blank">
            {link}
          </A>
        )}
        mode="bullets"
      />
    </div>
  );
};
