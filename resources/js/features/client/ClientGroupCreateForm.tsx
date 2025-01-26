import {createMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {FacilityClientGroup} from "data-access/memo-api/groups/FacilityClientGroup";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {VoidComponent} from "solid-js";
import {
  ClientGroupForm,
  ClientGroupFormType,
  clientGroupInitialValuesForCreate,
  transformFormValues,
} from "./ClientGroupForm";

export interface ClientGroupCreateFormProps {
  readonly initialValues?: Partial<ClientGroupFormType>;
  readonly currentClientId?: string;
  readonly onSuccess?: (clientGroupId: string) => void;
  readonly onCancel?: () => void;
}

export const ClientGroupCreateForm: VoidComponent<ClientGroupCreateFormProps> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const clientGroupCreateMutation = createMutation(() => ({
    mutationFn: FacilityClientGroup.createClientGroup,
    meta: {isFormSubmit: true},
  }));

  async function createClientGroup(values: ClientGroupFormType) {
    const {id} = (await clientGroupCreateMutation.mutateAsync(transformFormValues(values))).data.data;
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t("forms.client_group_create.success"));
      props.onSuccess?.(id);
      // Important: Invalidation should happen after calling onSuccess which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.facility.clientGroups();
    };
  }

  return (
    <ClientGroupForm
      id="client_group_create"
      initialValues={{
        ...clientGroupInitialValuesForCreate(),
        ...props.initialValues,
      }}
      currentClientId={props.currentClientId}
      onSubmit={createClientGroup}
      onCancel={props.onCancel}
    />
  );
};

// For lazy loading
export default ClientGroupCreateForm;
