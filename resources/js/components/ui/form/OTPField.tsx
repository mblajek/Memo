import {DocsModalInfoIcon} from "components/ui/docs_modal";
import {Show, splitProps, VoidComponent} from "solid-js";
import {TextField, TextFieldProps} from "./TextField";

export interface OTPFieldProps extends TextFieldProps {
  readonly showInfo?: boolean;
}

export const OTPField: VoidComponent<OTPFieldProps> = (allProps) => {
  const [props, fieldProps] = splitProps(allProps, ["showInfo"]);
  return (
    <TextField
      {...fieldProps}
      label={(origLabel) => (
        <div>
          {origLabel}
          <Show when={props.showInfo}>
            {" "}
            <DocsModalInfoIcon href="/help/otp-summary" fullPageHref={false} />
          </Show>
        </div>
      )}
      autocomplete="one-time-code"
      // Allow the format "000 000", because some authenticators show the digits in two groups.
      maxLength="7"
    />
  );
};

export function getOTPFromFormValue(otp: string) {
  return otp.replaceAll(" ", "");
}
