import {GetRef} from "components/utils/GetRef";
import {VoidComponent} from "solid-js";
import {Toaster as SolidToaster} from "solid-toast";

export const Toaster: VoidComponent = () => {
  const nonce = document.querySelector("meta[property='csp-nonce']")?.getAttribute("content");
  return (
    <GetRef
      ref={(ref) => {
        // The toaster is implemented in such a way that it creates a <style> element for some reason.
        // It needs to have nonce set, otherwise CSP will reject it.
        if (nonce && ref) {
          const styleElem = ref.querySelector("style");
          if (styleElem) {
            styleElem.nonce = nonce;
          }
        }
      }}
    >
      <SolidToaster
        position="bottom-right"
        toastOptions={{
          className: "mr-4 !pr-0",
          duration: 10_000,
        }}
      />
    </GetRef>
  );
};
