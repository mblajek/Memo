import {Help} from "features/root/pages/help/Help";
import {currentLanguage} from "i18n_loader";
import {createSignal, VoidComponent} from "solid-js";
import {Button} from "../ui/Button";
import {Modal, MODAL_STYLE_PRESETS} from "../ui/Modal";
import {useLangFunc} from "./lang";

// Be sure to keep in sync with supported-browsers.md
const EXPECTED_BROWSER_VERSIONS = [
  ["Chromium", 122],
  ["Firefox", 131],
] as const;
const REPORTED_BROWSERS = ["Google Chrome", "Microsoft Edge", "Chromium"];
const REPORTED_BROWSERS_IN_USER_AGENT_STRING = ["Chrome", "Edg" /* sic! */, "Firefox"];

export const BrowserWarning: VoidComponent = () => {
  const t = useLangFunc();
  let status: "unsupported" | "outdated" | "supported_up_to_date" = "unsupported";
  let browser: {browser: string; version?: number};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {userAgentData} = navigator as any;
  if (userAgentData?.brands) {
    const brandsMap = new Map<string, number | undefined>();
    for (const {brand, version: versionStr} of userAgentData.brands as {brand: string; version: string}[]) {
      const versionPart = versionStr.match(/\d+/)?.[0];
      const version = versionPart ? Number(versionPart) : undefined;
      brandsMap.set(brand, version);
    }
    const reportedBrowser = REPORTED_BROWSERS.find((b) => brandsMap.has(b)) || brandsMap.keys().next().value!;
    browser = {browser: reportedBrowser, version: brandsMap.get(reportedBrowser)};
    status = EXPECTED_BROWSER_VERSIONS.some(([b, v]) => {
      const brandVersion = brandsMap.get(b);
      return brandVersion && brandVersion >= v;
    })
      ? "supported_up_to_date"
      : EXPECTED_BROWSER_VERSIONS.some(([b, _v]) => brandsMap.has(b))
        ? "outdated"
        : "unsupported";
  } else {
    const match = navigator.userAgent.match(
      new RegExp(`\\b(${REPORTED_BROWSERS_IN_USER_AGENT_STRING.join("|")})/(\\d+)`),
    );
    if (match) {
      const reportedBrowser = match[1]!;
      const version = Number(match[2]);
      status = EXPECTED_BROWSER_VERSIONS.some(([b, v]) => b === reportedBrowser && version >= v)
        ? "supported_up_to_date"
        : EXPECTED_BROWSER_VERSIONS.some(([b, _v]) => b === reportedBrowser)
          ? "outdated"
          : "unsupported";
      browser = {browser: reportedBrowser, version};
    } else {
      browser = {browser: "unknown"};
    }
  }
  if (status === "supported_up_to_date") {
    // eslint-disable-next-line solid/components-return-once
    return undefined;
  }
  const [browserSupportInfo, setBrowserSupportInfo] = createSignal(false);
  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="text-red-600 font-semibold">{t(`browsers.${status}`)}</div>
        <div class="">{t("browsers.your_browser", browser)}</div>
        <Button class="linkLike" onClick={[setBrowserSupportInfo, true]}>
          {t("browsers.supported_browsers_info")}
        </Button>
      </div>
      <Modal
        open={browserSupportInfo()}
        style={MODAL_STYLE_PRESETS.docs}
        closeOn={["escapeKey", "closeButton", "clickOutside"]}
        onClose={() => setBrowserSupportInfo(false)}
        canDrag={false}
      >
        <div class="flex flex-col gap-1">
          <Help mdPath={`/docs/${currentLanguage()}/supported-browsers.md`} />
          <Button class="primary" onClick={() => setBrowserSupportInfo(false)}>
            {t("actions.ok")}
          </Button>
        </div>
      </Modal>
    </>
  );
};
