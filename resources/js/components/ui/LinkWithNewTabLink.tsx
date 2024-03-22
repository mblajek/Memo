import {A, AnchorProps, useLocation} from "@solidjs/router";
import {FiExternalLink} from "solid-icons/fi";
import {ParentComponent, Show} from "solid-js";
import {useLangFunc} from "../utils";

/**
 * A link, with an additional link opening in new tab.
 *
 * The primary link is just a text instead if it would go to the current page.
 */
export const LinkWithNewTabLink: ParentComponent<AnchorProps> = (props) => {
  const t = useLangFunc();
  const location = useLocation();
  const isOnThisUserPage = () => location.pathname === props.href;
  return (
    <span>
      <Show when={isOnThisUserPage()} fallback={<A {...props}>{props.children}</A>}>
        {props.children}
      </Show>{" "}
      <A {...props} target="_blank" title={t("open_in_new_tab")}>
        <FiExternalLink class="inlineIcon strokeIcon text-current" />
      </A>
    </span>
  );
};
