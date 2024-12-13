import {useParams} from "@solidjs/router";
import {EM_DASH} from "components/ui/symbols";
import {GetRef} from "components/utils/GetRef";
import {MemoTitle} from "features/root/MemoTitle";
import {createSignal, Show, VoidComponent} from "solid-js";
import {Help} from "./Help";

export default (() => {
  const params = useParams();
  return (
    <Help
      mdPath={`/docs/dev/${params.helpPath}.md`}
      onH1={(h1Props, def) => {
        const [h1, setH1] = createSignal<HTMLElement>();
        return (
          <>
            <Show when={h1()}>
              <MemoTitle title={`${h1()!.textContent} ${EM_DASH} DEV Help`} />
            </Show>
            <GetRef ref={setH1}>{def()}</GetRef>
          </>
        );
      }}
    />
  );
}) satisfies VoidComponent;
