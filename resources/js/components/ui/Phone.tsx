import {CountryCode, ParseError, parsePhoneNumberWithError} from "libphonenumber-js";
import {FaSolidPhone} from "solid-icons/fa";
import {Show, VoidComponent, createMemo, splitProps} from "solid-js";
import {htmlAttributes, useLangFunc} from "../utils";
import {WarningMark} from "./WarningMark";
import {EmptyValueSymbol} from "./symbols";
import {title} from "./title";

type _Directives_ = typeof title;

interface Props extends htmlAttributes.span {
  readonly phone: string | undefined;
}

export const Phone: VoidComponent<Props> = (allProps) => {
  const [props, spanProps] = splitProps(allProps, ["phone"]);
  const t = useLangFunc();
  // TODO: Country could be obtained from facility data.
  const country = () => "PL";
  const data = createMemo(() => {
    if (!props.phone) {
      return undefined;
    }
    let phone;
    try {
      phone = parsePhoneNumberWithError(props.phone, country() as CountryCode);
    } catch (e) {
      if (e instanceof ParseError) {
        return {
          formatted: props.phone.replaceAll(" ", ""),
          error: t(`phone_number.errors.${e.message}`, {defaultValue: t("phone_number.errors.unknown")}),
        };
      }
      throw e;
    }
    return {
      phone: phone,
      formatted: phone
        .format(phone.country === country() ? "NATIONAL" : "INTERNATIONAL")
        .replaceAll(" ", "\u2009" /* thin space */),
      error: phone.isValid() ? undefined : t("phone_number.errors.unknown"),
    };
  });
  return (
    <span {...spanProps}>
      <Show when={props.phone} fallback={<EmptyValueSymbol />}>
        <span class="whitespace-nowrap">
          <FaSolidPhone class="inlineIcon mr-1" />
          <span class="overflow-hidden">{data()?.formatted}</span>
        </span>
        <Show when={data()?.error}>
          {(error) => (
            <span use:title={error()}>
              <WarningMark />
            </span>
          )}
        </Show>
      </Show>
    </span>
  );
};
