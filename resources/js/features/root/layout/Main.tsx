import {style} from "components/ui/inline_styles";
import {ParentComponent} from "solid-js";

export const Main: ParentComponent = (props) => {
  return (
    <main class="overflow-x-hidden overflow-y-auto" {...style({"grid-area": "main"})}>
      {props.children}
    </main>
  );
};
