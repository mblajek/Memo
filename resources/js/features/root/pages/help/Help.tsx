import {useLocation} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {capitalizeString} from "components/ui/Capitalize";
import {Markdown} from "components/ui/Markdown";
import {getIconByName, ICON_SET_NAMES} from "components/ui/icons";
import {QueryBarrier, SimpleErrors} from "components/utils/QueryBarrier";
import {useLangFunc} from "components/utils/lang";
import {createMemo, JSX, onMount, Show, VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {resolvePath} from "./markdown_resolver";

interface Props {
  /** The path to the markdown file to show. */
  readonly mdPath: string;
  /** The path of the docs page being shown, defaults to location.pathname. */
  readonly currentPath?: string;
  /** Whether the help is included in another document. This causes the component not to set padding etc. Default: false */
  readonly inlined?: boolean;
  readonly offerNewTabLinks?: boolean;
  /** Callback providing the content of the h1 element. By default, a regular `<h1>` element is rendered. */
  readonly onH1?: (h1Props: JSX.IntrinsicElements["h1"], def: () => JSX.Element) => JSX.Element;
}

const ICON_SET_NAMES_PATTERN = ICON_SET_NAMES.join("|");

/**
 * A component displaying a help page, loaded from the mdPath as markdown.
 *
 * The component rewrites image sources to be relative to the mdPath.
 */
export const Help: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const location = useLocation();
  const query = createQuery(() => ({
    queryFn: async ({signal}) => {
      const resp = await fetch(props.mdPath, {cache: "no-cache", signal});
      const text = await resp.text();
      if (!resp.ok) {
        return Promise.reject({status: resp.status, statusText: resp.statusText, data: text});
      }
      return text;
    },
    queryKey: ["help", props.mdPath],
  }));
  import.meta.hot?.on("docsFileChange", () => query.refetch());
  function processMarkdown(markdown: string) {
    return markdown.replaceAll(/\$t\((\w[\w.]+)(\|cap)?\)/g, (match, key, cap) => {
      const text = t(key);
      return cap ? capitalizeString(text) : text;
    });
  }
  onMount(() => {
    if (location.hash) {
      setTimeout(() => document.querySelector(`a[href="${location.hash}"]`)?.scrollIntoView(), 100);
    }
  });
  const currentPathInfo = createMemo(() => ({
    path: props.currentPath || location.pathname,
    isLocationPath: !props.currentPath || props.currentPath === location.pathname,
  }));
  return (
    <div class={props.inlined ? undefined : "overflow-y-auto p-2 pr-4 max-w-5xl"}>
      <QueryBarrier
        queries={[query]}
        error={(queries) => (
          <Show
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            when={query.isError && (query.error as any)?.status === 404}
            fallback={<SimpleErrors queries={queries} />}
          >
            <div class="w-fit bg-purple-100 m-2 p-4 rounded-md">
              <h1 class="text-xl text-center mb-2">{t("errors.docs_page_not_found.title")}</h1>
              <p>{t("errors.docs_page_not_found.body", {url: currentPathInfo().path})}</p>
            </div>
          </Show>
        )}
      >
        <Markdown
          markdown={processMarkdown(query.data!)}
          linksRelativeTo={currentPathInfo().path}
          offerNewTabLinks={props.offerNewTabLinks}
          allowSelfAnchorLinks={currentPathInfo().isLocationPath}
          components={{
            h1: (h1Props) => {
              const def = () => <h1 {...h1Props} />;
              return props.onH1 ? props.onH1(h1Props, def) : def();
            },
            img: (imgProps) => {
              return (
                <img
                  {...{
                    ...imgProps,
                    node: undefined,
                    src: resolvePath(props.mdPath, imgProps.src!),
                  }}
                />
              );
            },
            p: (pProps) => {
              const includedPath = () => {
                if (pProps.node.children.length === 1 && pProps.node.children[0]!.type === "text") {
                  const match = pProps.node.children[0]!.value.match(/^\$include\(([^)\s]+\.md)\)$/);
                  if (match) {
                    return resolvePath(props.mdPath, match[1]!);
                  }
                }
                return undefined;
              };
              return (
                <Show when={includedPath()} fallback={<p {...pProps} />}>
                  {(includedPath) => <Help mdPath={includedPath()} inlined offerNewTabLinks={props.offerNewTabLinks} />}
                </Show>
              );
            },
            code: (codeProps) => {
              const icon = createMemo((): JSX.Element | undefined => {
                if (codeProps.node.children.length === 1 && codeProps.node.children[0]!.type === "text") {
                  const match = codeProps.node.children[0]!.value.match(
                    new RegExp(`^\\$icon\\((${ICON_SET_NAMES_PATTERN})\\.(\\w+)\\)$`),
                  );
                  if (match) {
                    const icon = getIconByName(match[1]!, match[2]!);
                    if (icon) {
                      return <Dynamic component={icon} class="inlineIcon" />;
                    }
                  }
                }
              });
              return (
                <Show when={icon()} fallback={<code {...codeProps} />}>
                  {(icon) => icon()}
                </Show>
              );
            },
          }}
        />
      </QueryBarrier>
    </div>
  );
};
