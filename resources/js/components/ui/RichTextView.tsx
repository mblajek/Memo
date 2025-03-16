import {htmlAttributes} from "components/utils/html_attributes";
import {Index, JSX, splitProps, VoidComponent} from "solid-js";
import {SimpleTag, TagsLine} from "./Tag";

interface Props extends htmlAttributes.div {
  readonly text: string | undefined;
  readonly fallback?: JSX.Element;
}

/** Maximum length of a tag in characters. If longer, it's just plain text. */
const MAX_TAG_LENGTH = 50;

// Based on https://daringfireball.net/2010/07/improved_regex_for_matching_urls
const URL_REGEXP =
  /\b((?:(?:https?|ftp):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()[\]{};:'".,<>?«»“”‘’]))/gi;

/**
 * A viewer for rich text.
 *
 * Currently only supports custom tags, created as `#tag` or `#long tag`, not mixed with non-tag
 * elements on a single text line.
 */
export const RichTextView: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["text", "fallback"]);
  const content = () => {
    return props.text
      ? props.text.split("\n").map((line) => {
          if (line.match(/^#\p{L}/u)) {
            const tags = line
              .split(/(^|\s+)#(?=\p{L})/u)
              .map((tag) => tag.trim())
              .filter(Boolean);
            if (tags.every((tag) => tag.length <= MAX_TAG_LENGTH)) {
              return (
                <TagsLine class="my-px">{<Index each={tags}>{(tag) => <SimpleTag text={tag()} />}</Index>}</TagsLine>
              );
            }
          }
          const elements: JSX.Element[] = [];
          let lastMatchEnd = 0;
          for (;;) {
            const match = URL_REGEXP.exec(line);
            if (!match) {
              elements.push(line.slice(lastMatchEnd));
              break;
            }
            elements.push(line.slice(lastMatchEnd, match.index));
            const url = match[0];
            elements.push(
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>,
            );
            lastMatchEnd = match.index + url.length;
          }
          return (
            <>
              {elements}
              <br />
            </>
          );
        })
      : props.fallback;
  };
  return (
    <div {...htmlAttributes.merge(divProps, {class: "overflow-x-clip overflow-y-auto wrapText"})}>{content()}</div>
  );
};
