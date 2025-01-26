import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation} from "@tanstack/solid-query";
import {isAxiosError} from "axios";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {HideableSection} from "components/ui/HideableSection";
import {InfoIcon} from "components/ui/InfoIcon";
import {title} from "components/ui/title";
import {useLangFunc} from "components/utils/lang";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {toastSuccess} from "components/utils/toast";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Api} from "data-access/memo-api/types";
import {OcBlocked2} from "solid-icons/oc";
import {createSignal, Show, splitProps, VoidComponent} from "solid-js";
import {z} from "zod";
import {UserLink} from "../facility-users/UserLink";

type _Directives = typeof title;

const getSchema = () =>
  z.object({
    duplicateOf: z.string().optional(),
  });

export type ClientDeleteFormType = z.infer<ReturnType<typeof getSchema>>;

const READ_BEFORE_CONFIRM_MILLIS = 5000;

export interface ClientDeleteFormProps extends Omit<FormConfigWithoutTransformFn<ClientDeleteFormType>, "onSuccess"> {
  readonly id: string;
  readonly initialRequiresDuplicateOf?: boolean;
  readonly onSuccess?: ({duplicateOf}: {duplicateOf?: string}) => void;
  readonly onCancel?: () => void;
}

export const ClientDeleteForm: VoidComponent<ClientDeleteFormProps> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "initialRequiresDuplicateOf", "onSuccess", "onCancel"]);
  const t = useLangFunc();
  const modelQuerySpecs = useModelQuerySpecs();
  const invalidate = useInvalidator();
  const [requiresDuplicateOf, setRequiresDuplicateOf] = createSignal(props.initialRequiresDuplicateOf);
  const [readBeforeConfirm, setReadBeforeConfirm] = createSignal(true);
  setTimeout(() => setReadBeforeConfirm(false), READ_BEFORE_CONFIRM_MILLIS);
  const deleteClientMutation = createMutation(() => ({
    mutationFn: FacilityClient.deleteClient,
    meta: {isFormSubmit: true},
  }));

  async function deleteClient(values: ClientDeleteFormType) {
    const {duplicateOf} = values;
    await deleteClientMutation.mutateAsync({id: props.id, duplicateOf});
    toastSuccess(t(duplicateOf ? "forms.client_delete.success.deduplicate" : "forms.client_delete.success.remove"));
    props.onSuccess?.({duplicateOf});
    invalidate.facility.users();
    invalidate.facility.clientGroups();
  }

  const ClientInfo: VoidComponent<{readonly userId: string}> = (props) => (
    <div class="flex gap-x-2 justify-between flex-wrap items-baseline">
      <UserLink type="clients" userId={props.userId} link={false} newTabLink />
      <div
        class="ml-auto font-mono text-grey-text text-sm whitespace-nowrap"
        use:title={t("forms.client_delete.form_info.client_id_hint")}
      >
        {props.userId}
      </div>
    </div>
  );

  return (
    <FelteForm
      id="client_delete"
      schema={getSchema()}
      translationsFormNames={["client_delete", "client", "facility_user"]}
      translationsModel={["client", "facility_user"]}
      class="flex flex-col gap-4 items-stretch"
      {...formProps}
      onSubmit={deleteClient}
      onError={(error) => {
        if (
          isAxiosError(error) &&
          (error.response?.data as Api.ErrorResponse | undefined)?.errors.find(
            (e) =>
              Api.isValidationError(e) &&
              e.field === "duplicateOf" &&
              (e.code === "validation.required" || e.code === "validation.present"),
          )
        )
          setRequiresDuplicateOf(true);
      }}
      preventPageLeave={false}
    >
      {(form) => {
        const missingDuplicateOf = () => requiresDuplicateOf() && !form.data("duplicateOf");
        const submitDisabled = () =>
          readBeforeConfirm() || missingDuplicateOf() || form.data("duplicateOf") === props.id;
        return (
          <>
            <div class="flex flex-col gap-2">
              <div>
                <InfoIcon href="/help/client-delete" title="">
                  {(icon) => (
                    <>
                      {icon} {t("forms.client_delete.form_info.more_info")}
                    </>
                  )}
                </InfoIcon>
              </div>
              <div class="text-red-600 font-bold">{t("forms.client_delete.form_info.warn")}</div>
              <div class="flex flex-col">
                <div class="font-bold">{t("forms.client_delete.form_info.deleted_client")}</div>
                <ClientInfo userId={props.id} />
              </div>
              <div class="flex flex-col">
                <HideableSection show={!requiresDuplicateOf()} transitionTimeMs={500}>
                  <div>
                    {t("forms.client_delete.form_info.duplicate_of_info.optional")}{" "}
                    <InfoIcon href="/help/client-delete" />
                  </div>
                </HideableSection>
                <HideableSection show={requiresDuplicateOf()} transitionTimeMs={500}>
                  <div class="font-semibold">
                    {t("forms.client_delete.form_info.duplicate_of_info.required")}{" "}
                    <InfoIcon href="/help/client-delete" />
                  </div>
                </HideableSection>
              </div>
              <div class="flex flex-col">
                <TQuerySelect
                  name="duplicateOf"
                  {...modelQuerySpecs.userClient()}
                  nullable={!requiresDuplicateOf()}
                  small
                />
                <HideableSection show={form.data("duplicateOf")}>
                  <ClientInfo userId={form.data("duplicateOf")} />
                </HideableSection>
                <Show when={form.data("duplicateOf") === props.id}>
                  <div class="text-red-600 font-bold">{t("forms.client_delete.form_info.duplicate_of_is_same")}</div>
                </Show>
              </div>
            </div>
            <FelteSubmit
              class="secondary"
              disabled={submitDisabled()}
              title={submitDisabled() ? t("forms.client_delete.form_info.disabled_submit_hint") : undefined}
              submitLabel={
                missingDuplicateOf()
                  ? (defLabel) => (
                      <span>
                        <OcBlocked2 class="inlineIcon text-red-700" /> {defLabel}
                      </span>
                    )
                  : undefined
              }
              cancel={props.onCancel}
            />
          </>
        );
      }}
    </FelteForm>
  );
};

// For lazy loading
export default ClientDeleteForm;
