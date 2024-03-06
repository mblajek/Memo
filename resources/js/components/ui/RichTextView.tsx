import {Index, VoidComponent} from "solid-js";
import {htmlAttributes} from "../utils";
import {SimpleTag, TagsLine} from "./Tag";

interface Props extends htmlAttributes.div {
  readonly text: string | undefined;
}

/** Maximum length of a tag in characters. If longer, it's just plain text. */
const MAX_TAG_LENGTH = 50;

/**
 * A viewer for rich text.
 *
 * Currently only supports custom tags, created as `#tag` or `#long tag`, not mixed with non-tag
 * elements on a single text line.
 */
export const RichTextView: VoidComponent<Props> = (props) => {
  const content = () => {
    return props.text?.split("\n").map((line) => {
      if (line.match(/^#\w/)) {
        const tags = line
          .split(/(^|\s+)#(?=\w)/)
          .map((tag) => tag.trim())
          .filter(Boolean);
        if (tags.every((tag) => tag.length <= MAX_TAG_LENGTH)) {
          return <TagsLine class="my-px">{<Index each={tags}>{(tag) => <SimpleTag text={tag()} />}</Index>}</TagsLine>;
        }
      }
      return line + "\n";
    });
  };
  return <div {...htmlAttributes.merge(props, {class: "wrapText"})}>{content()}</div>;
};
