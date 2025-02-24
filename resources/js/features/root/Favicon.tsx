import {Link} from "@solidjs/meta";
import {createQuery} from "@tanstack/solid-query";
import {isDEV} from "components/utils/dev_mode";
import {User} from "data-access/memo-api/groups/User";
import {useEnvInfo} from "features/system-status/env_info";
import {Base64} from "js-base64";
import {createMemo, createSignal, on, Show, VoidComponent} from "solid-js";

const FAVICON_PATH = "/favicon.png";

export const Favicon: VoidComponent = () => {
  const envInfo = useEnvInfo();
  const status = createQuery(User.statusQueryOptions);
  // First remove the original link from the head.
  document.querySelector("head > link[rel='icon'][href]")?.remove();
  const fill = () => {
    const bg = envInfo.style()?.background;
    // Return some color for long background, which might be e.g. `url(...)` which would not work.
    return bg ? (bg.length > 30 ? "#bcbd" : bg) : undefined;
  };
  const [faviconDataURI, setFaviconDataURI] = createSignal<string>();
  fetch(FAVICON_PATH)
    .then((resp) => resp.bytes())
    .then((favicon) => setFaviconDataURI(`data:image/png;base64,${Base64.fromUint8Array(favicon)}`));
  const iconURI = createMemo(
    on(
      [faviconDataURI, fill, isDEV, () => status.data?.permissions.developer],
      ([faviconDataURI, fill, isDEV, developer]) => {
        if (!faviconDataURI) {
          return undefined;
        }
        if (fill || isDEV || developer) {
          return `data:image/svg+xml;base64,${Base64.encode(
            (
              (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                  <image width="100" height="100" href={faviconDataURI} />
                  <Show when={fill}>
                    <circle cx="75" cy="75" r="25" fill={fill} />
                  </Show>
                  <Show when={isDEV || developer}>
                    <circle cx="25" cy="75" r="25" fill={developer ? "#ff0d" : "#fffd"} />
                    <text
                      x="2"
                      y="21.1"
                      transform="scale(4.5)"
                      fill="red"
                      style={{"font-family": "monospace", "font-weight": "bold"}}
                    >
                      D
                    </text>
                  </Show>
                </svg>
              ) as SVGSVGElement
            ).outerHTML,
          )}`;
        }
        return undefined;
      },
    ),
  );
  return <Link rel="icon" href={iconURI() || FAVICON_PATH} />;
};
