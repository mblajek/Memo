import {VoidComponent} from "solid-js";
import {ExternalLink} from "./ExternalLink";
import {ThingsList} from "./ThingsList";

interface Props {
  readonly links: readonly string[];
}

export const LinksList: VoidComponent<Props> = (props) => {
  return (
    <div class="text-sm">
      <ThingsList things={props.links} map={(link) => <ExternalLink link={link} />} mode="bullets" />
    </div>
  );
};
