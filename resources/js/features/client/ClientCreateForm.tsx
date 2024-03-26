import {createMutation} from "@tanstack/solid-query";
import {toastSuccess} from "components/utils/toast";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {VoidComponent} from "solid-js";
import {ClientForm, ClientFormType} from "./ClientForm";

export interface ClientCreateFormProps {
  readonly initialValues?: Partial<ClientFormType>;
  readonly onSuccess?: (clientId: string) => void;
  readonly onCancel?: () => void;
}

export const ClientCreateForm: VoidComponent<ClientCreateFormProps> = (props) => {
  const invalidate = useInvalidator();
  const clientCreateMutation = createMutation(() => ({
    mutationFn: FacilityClient.createClient,
    meta: {isFormSubmit: true},
  }));

  async function createClient(values: ClientFormType) {
    const {id} = (await clientCreateMutation.mutateAsync(values)).data.data;
    toastSuccess("forms.client_create.success");
    props.onSuccess?.(id);
    // Important: Invalidation should happen after calling onSuccess which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.clients();
  }

  const initialValues = () =>
    ({
      name: "",
      client: {},
    }) satisfies ClientFormType;

  return (
    <ClientForm id="client_create" initialValues={initialValues()} onSubmit={createClient} onCancel={props.onCancel} />
  );
};

// For lazy loading
export default ClientCreateForm;
