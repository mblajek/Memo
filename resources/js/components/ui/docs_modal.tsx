import {AnchorProps} from "@solidjs/router";
import {Modal, MODAL_STYLE_PRESETS} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {Help} from "features/root/pages/help/Help";
import {resolveMdFromAppPath} from "features/root/pages/help/markdown_resolver";
import {Show, splitProps, VoidComponent} from "solid-js";
import {Button, ButtonProps} from "./Button";
import {InfoIcon} from "./InfoIcon";
import {LinkWithNewTabLink} from "./LinkWithNewTabLink";

export interface DocsModalProps {
  /** The link to the docs page to show in the modal. Does not support #anchors. */
  readonly href: string;
  /**
   * The link to the docs page to open when the link at the bottom is clicked. True to use the same
   * as href, false to disable. Default: false if href ends with ".part", true otherwise.
   */
  readonly fullPageHref?: string | boolean;
  readonly linkProps?: AnchorProps;
}

export const createDocsModal = registerGlobalPageElement<DocsModalProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      open={args.params()}
      closeOn={["escapeKey", "clickOutside", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.wide}
    >
      {(data) => {
        const fullPageHref = () => {
          const f = data().fullPageHref ?? !data().href.endsWith(".part");
          return f === true ? data().href : f || undefined;
        };
        return (
          <div class="flex flex-col items-stretch">
            <Help mdPath={resolveMdFromAppPath(data().href)} currentPath={data().href} inlined offerNewTabLinks />
            <Show when={fullPageHref()}>
              {(fullPageHref) => (
                <LinkWithNewTabLink href={fullPageHref()} {...data().linkProps}>
                  {t("help.open_full_help_page")}
                </LinkWithNewTabLink>
              )}
            </Show>
            <Button class="self-center w-80 secondary" onClick={args.clearParams}>
              {t("actions.ok")}
            </Button>
          </div>
        );
      }}
    </Modal>
  );
});

export type DocsModal = ReturnType<typeof createDocsModal>;

export interface DocsModalInfoIconProps extends DocsModalProps, Omit<ButtonProps, "children"> {
  readonly staticDocsModal?: DocsModal;
}

export const DocsModalInfoIcon: VoidComponent<DocsModalInfoIconProps> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["href", "fullPageHref", "linkProps", "staticDocsModal"]);
  const docsModal = props.staticDocsModal || createDocsModal();
  return (
    <InfoIcon
      {...buttonProps}
      onClick={(e) => {
        htmlAttributes.callHandler(buttonProps.onClick, e);
        docsModal.hide();
        docsModal.show(props);
      }}
    />
  );
};

/**
 * Returns a component identical to DocsModalInfoIcon, but using a docs modal created directly by this function.
 * This allows the icon usage to disappear after it invokes the modal, without destroying the modal.
 */
export function useDocsModalInfoIcon() {
  const docsModal = createDocsModal();
  const LocalDocsModalInfoIcon: VoidComponent<DocsModalInfoIconProps> = (props) => (
    <DocsModalInfoIcon staticDocsModal={docsModal} {...props} />
  );
  return {DocsModalInfoIcon: LocalDocsModalInfoIcon};
}
