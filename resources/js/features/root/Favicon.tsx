import {Link} from "@solidjs/meta";
import {useQuery} from "@tanstack/solid-query";
import {isDEV} from "components/utils/dev_mode";
import {User} from "data-access/memo-api/groups/User";
import {useEnvInfo} from "features/system-status/env_info";
import {Base64} from "js-base64";
import {createMemo, createSignal, on, Show, VoidComponent} from "solid-js";
import bowser from "bowser";

const FAVICON_PATH = "/favicon.png";

export const Favicon: VoidComponent = () => {
  const envInfo = useEnvInfo();
  const status = useQuery(User.statusQueryOptions);
  const browserInfo = bowser.parse(navigator.userAgent);
  // First remove the original link from the head.
  document.querySelector("head > link[rel='icon'][href]")?.remove();
  const fill = () => {
    const bg = envInfo.style()?.background;
    // Return some color for long background, which might be e.g. `url(...)` which would not work.
    return bg ? (bg.length > 30 ? "#bcbd" : bg) : undefined;
  };
  const [faviconDataURI, setFaviconDataURI] = createSignal<string>();
  void fetch(FAVICON_PATH)
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
                    <circle cx="75" cy="75" r="25" fill={fill} stroke="black" stroke-width="2" />
                  </Show>
                  <Show when={isDEV || developer}>
                    <circle
                      cx="25"
                      cy="75"
                      r="25"
                      fill={developer ? "#ff0d" : "#fffd"}
                      stroke="black"
                      stroke-width="1"
                    />
                    <path
                      d="m-5,10 v-20 h5 q5,0 5,5 v10 q0,5 -5,5 z" // Letter D (for Dev)
                      transform="translate(25,75) scale(1.6)"
                      vector-effect="non-scaling-stroke"
                      shape-rendering="crispEdges"
                      stroke="red"
                      // For some reason width of 1 looks much better on Firefox.
                      stroke-width={browserInfo.browser.name === "Firefox" ? 1 : 2}
                      fill="none"
                    />
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
