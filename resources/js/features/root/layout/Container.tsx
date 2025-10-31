import {style} from "components/ui/inline_styles";
import {ParentComponent} from "solid-js";

export const Container: ParentComponent = (props) => {
  return (
    <div
      class="w-dvw h-dvh p-0 m-0 bg-white overflow-hidden grid"
      {...style({
        "grid-template-areas": `
          "sidebar header"
          "sidebar main"
        `,
        "grid-template-columns": "auto 1fr",
        "grid-template-rows": "auto 1fr",
      })}
    >
      {props.children}
    </div>
  );
};
