import {A, AnchorProps, useLocation} from "@solidjs/router";
import {useLangFunc} from "components/utils/lang";
import {FiExternalLink} from "solid-icons/fi";
import {mergeProps, ParentComponent, Show, splitProps} from "solid-js";
import {title} from "./title";

type _Directives = typeof title;

interface Props extends AnchorProps {
  /** Whether the content should be a link to open in the same tab. Default: true. */
  readonly sameTabLink?: boolean;
  /** Whether the link icon to open in the new tab should be displayed. Default: same as sameTabLink, or false if target is _blank. */
  readonly newTabLink?: boolean;
  readonly newTabLinkTitle?: string;
  readonly newTabLinkProps?: Partial<AnchorProps>;
}

/**
 * A link, with an additional link opening in new tab.
 *
 * The primary link is just a text instead if it would go to the current page.
 */
export const LinkWithNewTabLink: ParentComponent<Props> = (allProps) => {
  const [props, anchorProps] = splitProps(allProps, [
    "sameTabLink",
    "newTabLink",
    "newTabLinkTitle",
    "newTabLinkProps",
    "children",
  ]);
  const t = useLangFunc();
  const location = useLocation();
  const isOnThisPage = () => location.pathname === anchorProps.href;
  // eslint-disable-next-line solid/reactivity
  const newTabAnchorProps = mergeProps(anchorProps, () => props.newTabLinkProps);
  return (
    <span class="text-current">
      <Show when={isOnThisPage() || props.sameTabLink === false} fallback={<A {...anchorProps}>{props.children}</A>}>
        {props.children}
      </Show>
      <Show when={anchorProps.target !== "_blank" && (props.newTabLink ?? props.sameTabLink) !== false}>
        {" "}
        <span use:title={props.newTabLinkTitle || t("open_in_new_tab")}>
          <A {...newTabAnchorProps} target="_blank">
            <FiExternalLink class="inlineIcon strokeIcon" />
          </A>
        </span>
      </Show>
    </span>
  );
};
