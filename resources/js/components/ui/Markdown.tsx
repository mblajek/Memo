import {A} from "@solidjs/router";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkCustomHeadingId from "remark-custom-heading-id";
import remarkGfm from "remark-gfm";
import {ComponentProps, Match, Switch, VoidComponent, splitProps} from "solid-js";
import {SolidMarkdown} from "solid-markdown";
import {htmlAttributes} from "../utils";
import s from "./Markdown.module.scss";

interface MarkdownProps extends ComponentProps<typeof SolidMarkdown> {
  readonly markdown: string;
}

export const Markdown: VoidComponent<MarkdownProps> = (allProps) => {
  const [props, markdownProps] = splitProps(allProps, ["markdown"]);
  return (
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
              <a {...aProps} />
            </Match>
            <Match when={true}>
              <A
                {...{
                  href: "",
                  ...aProps,
                  node: undefined,
                  // Open external links in a new tab. Don't use _self as it reloads the page.
                  target: aProps.href?.startsWith("http")
                    ? "_blank"
                    : aProps.target === "_self"
                      ? undefined
                      : aProps.target,
                }}
              />
            </Match>
          </Switch>
        ),
        ...markdownProps.components,
      }}
      children={props.markdown}
    />
  );
};
