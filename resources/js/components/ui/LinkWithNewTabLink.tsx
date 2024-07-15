import {A, AnchorProps, useLocation} from "@solidjs/router";
import {FiExternalLink} from "solid-icons/fi";
import {ParentComponent, Show, splitProps} from "solid-js";
import {useLangFunc} from "../utils";
import {title} from "./title";

const _DIRECTIVES_ = null && title;

interface Props extends AnchorProps {
  /** Whether the content should be a link to open in the same tab. Default: true. */
  readonly sameTabLink?: boolean;
  /** Whether the link icon to open in the new tab should be displayed. Default: same as sameTabLink. */
  readonly newTabLink?: boolean;
}

/**
 * A link, with an additional link opening in new tab.
 *
 * The primary link is just a text instead if it would go to the current page.
 */
export const LinkWithNewTabLink: ParentComponent<Props> = (allProps) => {
  const [props, anchorProps] = splitProps(allProps, ["sameTabLink", "newTabLink", "children"]);
  const t = useLangFunc();
  const location = useLocation();
  const isOnThisUserPage = () => location.pathname === anchorProps.href;
  return (
    <span class="text-current">
      <Show
        when={isOnThisUserPage() || props.sameTabLink === false}
        fallback={<A {...anchorProps}>{props.children}</A>}
      >
        {props.children}
      </Show>
      <Show when={(props.newTabLink ?? props.sameTabLink) !== false}>
        {" "}
        <span use:title={t("open_in_new_tab")}>
          <A {...anchorProps} target="_blank">
            <FiExternalLink class="inlineIcon strokeIcon" />
          </A>
        </span>
      </Show>
    </span>
  );
};
