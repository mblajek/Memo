import {AnchorProps} from "@solidjs/router";
import {Help} from "features/root/pages/help/Help";
import {resolveMdFromAppPath} from "features/root/pages/help/markdown_resolver";
import {createSignal, Show, splitProps, VoidComponent} from "solid-js";
import {useLangFunc} from "../utils";
import {Button} from "./Button";
import {InfoIcon} from "./InfoIcon";
import {LinkWithNewTabLink} from "./LinkWithNewTabLink";
import {Modal, MODAL_STYLE_PRESETS} from "./Modal";

export interface PageInfoIconProps extends Omit<AnchorProps, "children"> {
  readonly shortDocsHref?: string;
}

export const PageInfoIcon: VoidComponent<PageInfoIconProps> = (allProps) => {
  const [props, aProps] = splitProps(allProps, ["shortDocsHref"]);
  const t = useLangFunc();
  const [modalOpen, setModalOpen] = createSignal(false);
  return (
    <>
      <InfoIcon
        target="_blank"
        {...{
          ...aProps,
          ...(props.shortDocsHref
            ? {
                href: undefined,
                onClick: () => setModalOpen(true),
              }
            : undefined),
        }}
      />
      <Modal open={modalOpen()} onEscape={() => setModalOpen(false)} style={MODAL_STYLE_PRESETS.docs}>
        <div class="flex flex-col items-stretch">
          <Help mdPath={resolveMdFromAppPath(props.shortDocsHref!)} currentPath={props.shortDocsHref} inlined />
          <Show when={aProps.href}>
            <LinkWithNewTabLink {...aProps}>{t("help.open_full_help_page")}</LinkWithNewTabLink>
          </Show>
          <Button class="self-center w-80 secondary" onClick={() => setModalOpen(false)}>
            {t("actions.ok")}
          </Button>
        </div>
      </Modal>
    </>
  );
};
