import {useLocation} from "@solidjs/router";
import {GetRef} from "components/utils/GetRef";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {createSignal, Show, VoidComponent} from "solid-js";
import {Help} from "./Help";
import {resolveMdFromAppPath} from "./markdown_resolver";

export default (() => {
  const location = useLocation();
  return (
    <Help
      // In DEV use the local docs files, otherwise use files hosted remotely.
      mdPath={resolveMdFromAppPath(location.pathname)}
      onH1={(h1Props, def) => {
        const [h1, setH1] = createSignal<HTMLElement>();
        return (
          <>
            <Show when={h1()}>
              <AppTitlePrefix prefix={h1()!.textContent || undefined} />
            </Show>
            <GetRef ref={setH1}>{def()}</GetRef>
          </>
        );
      }}
    />
  );
}) satisfies VoidComponent;
