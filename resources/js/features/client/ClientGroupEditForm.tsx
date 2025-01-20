import {createMutation, createQuery} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {notFoundError} from "components/utils/NotFoundError";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {toastSuccess} from "components/utils/toast";
import {FacilityClientGroup} from "data-access/memo-api/groups/FacilityClientGroup";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Api} from "data-access/memo-api/types";
import {VoidComponent} from "solid-js";
import {
  ClientGroupForm,
  ClientGroupFormType,
  clientGroupInitialValuesForEdit,
  transformFormValues,
} from "./ClientGroupForm";

export interface ClientGroupEditFormProps {
  readonly staticGroupId: Api.Id;
  readonly currentClientId?: string;
  readonly initialValuesEditFunc?: (initialValues: ClientGroupFormType) => ClientGroupFormType;
  readonly onSuccess?: () => void;
  readonly onDeleted?: () => void;
  readonly onCancel?: () => void;
}

export const ClientGroupEditForm: VoidComponent<ClientGroupEditFormProps> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const clientGroupQuery = createQuery(() => FacilityClientGroup.clientGroupQueryOptions(props.staticGroupId));
  const clientGroup = () => clientGroupQuery.data;
  const clientGroupPatchMutation = createMutation(() => ({
    mutationFn: FacilityClientGroup.updateClientGroup,
    meta: {isFormSubmit: true},
  }));

  async function updateClientGroup(values: Partial<ClientGroupFormType>) {
    await clientGroupPatchMutation.mutateAsync({id: props.staticGroupId, ...transformFormValues(values)});
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t("forms.client_group_edit.success"));
      props.onSuccess?.();
      // Important: Invalidation should happen after calling onEdited which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.facility.clientGroups();
    };
  }

  return (
    <QueryBarrier queries={[clientGroupQuery]} ignoreCachedData {...notFoundError()}>
      <ClientGroupForm
        id="client_group_edit"
        initialValues={(props.initialValuesEditFunc || ((v) => v))(clientGroupInitialValuesForEdit(clientGroup()!))}
        currentClientId={props.currentClientId}
        onSubmit={updateClientGroup}
        onCancel={() => props.onCancel?.()}
      />
    </QueryBarrier>
  );
};

// For lazy loading
export default ClientGroupEditForm;
