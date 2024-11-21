import {useLocation} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {capitalizeString} from "components/ui/Capitalize";
import {Markdown} from "components/ui/Markdown";
import {EM_DASH} from "components/ui/symbols";
import {QueryBarrier, SimpleErrors, useLangFunc} from "components/utils";
import {MemoTitle} from "features/root/MemoTitle";
import {Show, VoidComponent, createSignal, onMount} from "solid-js";
import {resolvePath} from "./markdown_resolver";

interface Props {
  readonly title?: string;
  readonly currentPath?: string;
  readonly mdPath: string;
  /** Whether the help is included in another document. This causes the component not to set padding etc. Default: false */
  readonly inlined?: boolean;
  readonly offerNewTabLinks?: boolean;
}

/**
 * A component displaying a help page, loaded from the mdPath as markdown.
 *
 * If props.title is specified, this component sets the page title to props.title,
 * prepended with the `# Title` from the markdown.
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
              <p>{t("errors.docs_page_not_found.body", {url: props.currentPath || location.pathname})}</p>
            </div>
          </Show>
        )}
      >
        <Markdown
          markdown={processMarkdown(query.data!)}
          linksRelativeTo={props.currentPath || location.pathname}
          offerNewTabLinks={props.offerNewTabLinks}
          components={{
            // Set the page title based on the # header.
            h1: (h1Props) => {
              const [h1Title, setH1Title] = createSignal<string>();
              return (
                <>
                  <Show when={props.title && h1Title()}>
                    <MemoTitle title={`${h1Title()} ${EM_DASH} ${props.title}`} />
                  </Show>
                  <h1 ref={(h1) => onMount(() => setH1Title(h1.textContent || undefined))} {...h1Props} />
                </>
              );
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
          }}
        />
      </QueryBarrier>
    </div>
  );
};
