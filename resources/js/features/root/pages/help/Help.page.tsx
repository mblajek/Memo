import {useLocation} from "@solidjs/router";
import {capitalizeString} from "components/ui/Capitalize";
import {EM_DASH} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {GetRef} from "components/utils/GetRef";
import {MemoTitle} from "features/root/MemoTitle";
import {createSignal, Show, VoidComponent} from "solid-js";
import {Help} from "./Help";
import {resolveMdFromAppPath} from "./markdown_resolver";

export default (() => {
  const t = useLangFunc();
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
              <MemoTitle title={`${h1()!.textContent} ${EM_DASH} ${capitalizeString(t("routes.help"))}`} />
            </Show>
            <GetRef ref={setH1}>{def()}</GetRef>
          </>
        );
      }}
    />
  );
}) satisfies VoidComponent;
