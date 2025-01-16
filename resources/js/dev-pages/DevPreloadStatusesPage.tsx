import {Button} from "components/ui/Button";
import {EN_DASH} from "components/ui/symbols";
import {getPreloadedModulesInfo} from "components/utils/lazy_auto_preload";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {For, VoidComponent} from "solid-js";

export default (() => {
  return (
    <>
      <AppTitlePrefix prefix="Preload statuses" />
      <div class="p-2 grid gap-x-1 text-sm" style={{"grid-template-columns": "auto auto auto"}}>
        <div class="font-bold contents">
          <div>Module</div>
          <div>Loaded?</div>
          <div>Used?</div>
        </div>
        <For each={[...getPreloadedModulesInfo()].sort((a, b) => a[0].localeCompare(b[0]))}>
          {([module, info]) => {
            const match = module.match(/^(.*\/)?(.+?)((?:\.tsx?|-[a-zA-Z0-9-_]{8}\.js)?(?:\?.+)?)$/) || [
              undefined,
              "",
              module,
              "",
            ];
            return (
              <>
                <div class="text-xs text-black text-opacity-40">
                  {match[1]}
                  <span class="text-sm text-black">{match[2]}</span>
                  {match[3]}
                </div>
                <div>
                  <Button
                    class="text-start pr-4 w-auto"
                    onClick={info.preload}
                    title={info.preloaded ? undefined : "Click to preload"}
                  >
                    {info.loaded ? "✓" + (info.preloaded ? " pre" : "") : EN_DASH}
                  </Button>
                </div>
                <div>{info.used ? "✓" : EN_DASH}</div>
              </>
            );
          }}
        </For>
      </div>
    </>
  );
}) satisfies VoidComponent;
