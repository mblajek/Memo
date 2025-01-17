import {useLocation} from "@solidjs/router";
import {resolvePath} from "features/root/pages/help/markdown_resolver";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkCustomHeadingId from "remark-custom-heading-id";
import remarkGfm from "remark-gfm";
import {ComponentProps, createEffect, createSignal, Match, splitProps, Switch, VoidComponent} from "solid-js";
import {SolidMarkdown} from "solid-markdown";
import {htmlAttributes} from "../utils";
import {LinkWithNewTabLink} from "./LinkWithNewTabLink";
import s from "./Markdown.module.scss";

interface MarkdownProps extends ComponentProps<typeof SolidMarkdown> {
  readonly markdown: string;
  readonly linksRelativeTo: string;
  readonly offerNewTabLinks?: boolean;
  /** Whether anchor links pointing to the same document are allowed. Default: true. */
  readonly allowSelfAnchorLinks?: boolean;
}

/**
 * The component for rendering markdown.
 *
 * Markdown supports standard syntax, tables and custom header anchors (ids). It also creates
 * `<A>` elements for links so that the page does not reload.
 *
 * The component can be further configured using the props of the underlying SolidMarkdown component.
 */
export const Markdown: VoidComponent<MarkdownProps> = (allProps) => {
  const [props, markdownProps] = splitProps(allProps, [
    "markdown",
    "linksRelativeTo",
    "offerNewTabLinks",
    "allowSelfAnchorLinks",
  ]);
  const location = useLocation();
  const [element, setElement] = createSignal<HTMLDivElement>();
  createEffect(() => {
    const currentHash = location.hash.slice(1);
    for (const heading of element()?.querySelectorAll([1, 2, 3, 4, 5, 6].map((l) => `h${l}[id]`).join(",")) || []) {
      heading.classList.toggle(s.activeHeader!, heading.id === currentHash);
    }
  });
  return (
    <div ref={setElement}>
      <SolidMarkdown
        remarkPlugins={[
          // The plugin seems to work correctly, but there is some typing problem.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          remarkCustomHeadingId as any,
          remarkGfm,
        ]}
        rehypePlugins={[[rehypeAutolinkHeadings, {behavior: "wrap"}]]}
        {...htmlAttributes.merge(markdownProps, {class: s.markdown})}
        components={{
          // Convert links to `<A>` elements so that the page does not reload.
          a: (aProps) => (
            <Switch>
              <Match when={aProps.href?.startsWith("#")}>
                {/* Anchor links don't work very well on the A component. */}
                <a {...{...aProps, ...(props.allowSelfAnchorLinks ? undefined : {href: undefined})}} />
              </Match>
              <Match when="other file">
                <LinkWithNewTabLink
                  {...{
                    ...aProps,
                    href: aProps.href ? resolvePath(props.linksRelativeTo, aProps.href) : "",
                    node: undefined,
                    // Open external links in a new tab.
                    ...(aProps.href?.startsWith("http")
                      ? {target: "_blank"}
                      : {
                          // Don't use _self as it reloads the page.
                          target: aProps.target === "_self" ? undefined : aProps.target,
                          newTabLink: props.offerNewTabLinks ?? false,
                        }),
                  }}
                />
              </Match>
            </Switch>
          ),
          ...markdownProps.components,
        }}
        children={props.markdown}
      />
    </div>
  );
};
