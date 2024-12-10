import {A, AnchorProps} from "@solidjs/router";
import {createMemo, VoidComponent} from "solid-js";
import {title} from "./title";

type _Directives = typeof title;

const URL_REGEXP = /^(ftp:|https?:|www\d?\.)\S+$/;

interface Props {
  readonly link: string;
  readonly linkProps?: Partial<AnchorProps>;
  /** Whether to show the full URL as a hover title. Default: true */
  readonly showTitle?: boolean;
  /**
   * Whether to allow specifying link text in link. Default: true.
   * Supported variants:
   * - `http://example.com link text`
   * - `link text http://example.com`
   * - `link text: http://example.com`
   */
  readonly allowLabel?: boolean;
}

export const ExternalLink: VoidComponent<Props> = (props) => {
  const linkData = createMemo(() => {
    const link = props.link.trim();
    const parts = link.trim().split(" ");
    if (parts.length === 1 || !(props.allowLabel ?? true)) {
      return {href: link, text: link};
    }
    const firstPart = parts[0]!;
    const lastPart = parts.at(-1)!;
    if (URL_REGEXP.test(lastPart)) {
      const text = parts.slice(0, -1).join(" ");
      return {href: lastPart, text: text.at(-1) === ":" ? text.slice(0, -1).trim() || lastPart : text};
    } else if (URL_REGEXP.test(firstPart)) {
      return {href: firstPart, text: parts.slice(1).join(" ")};
    } else {
      return {href: link, text: link};
    }
  });
  return (
    <span
      use:title={
        (props.showTitle ?? true)
          ? [<div class="wrapLinkAnywhere">{linkData().href}</div>, {delay: [1000, undefined]}]
          : undefined
      }
    >
      <A
        class="line-clamp-2 wrapLinkAnywhere"
        {...props.linkProps}
        href={linkData().href}
        target="_blank"
        {...props.linkProps}
      >
        {linkData().text}
      </A>
    </span>
  );
};
