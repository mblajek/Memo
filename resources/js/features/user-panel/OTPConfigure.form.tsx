import {A} from "@solidjs/router";
import {useMutation, useQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {HiddenUsernameField} from "components/ui/form/HiddenUsernameField";
import {getOTPFromFormValue, OTPField} from "components/ui/form/OTPField";
import {PasswordField} from "components/ui/form/PasswordField";
import {HideableSection} from "components/ui/HideableSection";
import {InfoIcon} from "components/ui/InfoIcon";
import {Markdown} from "components/ui/Markdown";
import {QRCode} from "components/ui/QRCode";
import {useLangFunc} from "components/utils/lang";
import {currentTimeSecond} from "components/utils/time";
import {toastSuccess} from "components/utils/toast";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {useEnvInfo} from "features/system-status/env_info";
import {DateTime} from "luxon";
import {createEffect, createMemo, createSignal, Show, VoidComponent} from "solid-js";
import {z} from "zod";

namespace otpGenerate {
  export const getSchema = () =>
    z.object({
      password: z.string(),
    });

  export type FormType = z.infer<ReturnType<typeof getSchema>>;

  export const initialValues = (): Readonly<FormType> => ({
    password: "",
  });
}

namespace otpConfigure {
  export const getSchema = () =>
    z.object({
      otp: z.string(),
    });

  export type FormType = z.infer<ReturnType<typeof getSchema>>;

  export const initialValues = (): Readonly<FormType> => ({
    otp: "",
  });
}

export interface OTPConfigureFormProps {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const OTPConfigureForm: VoidComponent<OTPConfigureFormProps> = (props) => {
  const t = useLangFunc();
  const envInfo = useEnvInfo();
  const invalidate = useInvalidator();
  const statusQuery = useQuery(User.statusQueryOptions);
  const generateMutation = useMutation(() => ({
    mutationFn: User.generateOTP,
    meta: {isFormSubmit: true},
  }));
  const configureMutation = useMutation(() => ({
    mutationFn: User.configureOTP,
    meta: {isFormSubmit: true},
  }));
  const [otpData, setOtpData] = createSignal<User.GenerateOTPResponse>();
  const [hideQRCode, setHideQRCode] = createSignal(false);

  const qrCodeURL = createMemo(() => {
    const secret = otpData()?.otpSecret;
    if (!secret || !statusQuery.data?.user.email) {
      return undefined;
    }
    const issuer = (envInfo.isProd() ? t("otp.issuer.prod") : t("otp.issuer.other", {appEnv: envInfo.appEnv()}))
      // Colon is not allowed in the issuer.
      .replaceAll(":", "");
    return (
      `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(statusQuery.data.user.email)}` +
      `?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
    );
  });
  const qrCodeTimeLeft = createMemo(() =>
    otpData()
      ? DateTime.fromISO(otpData()!.validUntil)
          // Avoid random rounding.
          .minus({seconds: 0.5})
          .diff(currentTimeSecond(), ["minutes", "seconds"])
      : undefined,
  );
  createEffect(() => {
    const timeLeft = qrCodeTimeLeft();
    if (timeLeft && timeLeft.toMillis() <= 0) {
      setOtpData(undefined);
    }
  });

  async function generateOTP(values: otpGenerate.FormType) {
    const result = await generateMutation.mutateAsync(values);
    return () => {
      setOtpData(result.data.data);
      setHideQRCode(false);
    };
  }

  async function configureOTP(values: otpConfigure.FormType) {
    await configureMutation.mutateAsync({otp: getOTPFromFormValue(values.otp)});
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t("forms.otp_configure.success"));
      props.onSuccess?.();
      invalidate.userStatusAndFacilityPermissions();
    };
  }

  return (
    <div class="flex flex-col">
      <Show when={statusQuery.data?.user.otpRequiredAt}>
        <div class="font-semibold text-red-600">{t("auth.otp_required")}</div>
      </Show>
      <A href="/help/staff-2fa#configure" target="_blank">
        {t("otp.more_info")} <InfoIcon title="" />
      </A>
      <Markdown class="mt-2" markdown={t("otp.intro_md")} linksRelativeTo="/help" />
      <div class="py-1 flex flex-col items-center">
        <QRCode size={250} content={hideQRCode() ? undefined : qrCodeURL()} />
      </div>
      <HideableSection show={!otpData()} destroyWhenFullyCollapsed>
        <FelteForm
          id="otp_generate"
          translationsModel="user"
          onSubmit={generateOTP}
          schema={otpGenerate.getSchema()}
          initialValues={otpGenerate.initialValues()}
          class="flex flex-col gap-2"
          preventPageLeave={false}
        >
          <HiddenUsernameField />
          <PasswordField name="password" autocomplete="current-password" autofocus allowShow="sensitive" />
          <FelteSubmit cancel={props.onCancel} />
        </FelteForm>
      </HideableSection>
      <HideableSection show={otpData()} destroyWhenFullyCollapsed>
        <div class="flex justify-between gap-2">
          <div>{t("otp.configure.time_left", {time: qrCodeTimeLeft()?.toFormat("m:ss")})}</div>
          <CheckboxInput
            checked={hideQRCode()}
            onChecked={setHideQRCode}
            label={<span class="font-normal">{t("actions.hide")}</span>}
          />
        </div>
        <FelteForm
          id="otp_configure"
          translationsModel="user"
          onSubmit={configureOTP}
          schema={otpConfigure.getSchema()}
          initialValues={otpConfigure.initialValues()}
          class="flex flex-col gap-2"
        >
          <OTPField name="otp" autofocus />
          <FelteSubmit cancel={props.onCancel} />
        </FelteForm>
      </HideableSection>
    </div>
  );
};
