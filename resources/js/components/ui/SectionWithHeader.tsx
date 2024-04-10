import {Accessor, JSX, ParentComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {SeparatedSections} from "./SeparatedSections";

interface Props extends htmlAttributes.div {
  readonly header: (show: Accessor<boolean>) => JSX.Element;
}

/**
 * A section with a header. The header is displayed only if the section is actually present, i.e.
 * has non-zero height.
 */
export const SectionWithHeader: ParentComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["header", "children"]);
  return (
    <SeparatedSections separator={(show) => <>{props.header(show)}</>}>
      {
        ""
        // This is treated as a present section because it is not a HTML element,
        // so the separator is shown if only the actual content is also present.
      }
      <div {...divProps}>{props.children}</div>
    </SeparatedSections>
  );
};
