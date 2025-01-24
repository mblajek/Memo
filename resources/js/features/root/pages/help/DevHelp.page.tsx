import {useParams} from "@solidjs/router";
import {GetRef} from "components/utils/GetRef";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {createSignal, Show, VoidComponent} from "solid-js";
import {Help} from "./Help";

export default (() => {
  const params = useParams();
  return (
    <>
      <AppTitlePrefix prefix="DEV Help" />
      <Help
        mdPath={`/docs/dev/${params.helpPath}.md`}
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
    </>
  );
}) satisfies VoidComponent;
