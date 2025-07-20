import {useFormContext} from "components/felte-form/FelteForm";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {FilterReductor} from "data-access/memo-api/tquery/filter_utils";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {createMemo, on} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {MeetingFormType} from "./MeetingForm";

interface SelectedClientData {
  readonly id: string;
  readonly contactPhone: string | undefined;
  readonly contactEmail: string | undefined;
  readonly notificationMethods: readonly string[];
  readonly groupIds: readonly string[];
}

export function useMeetingAttendantsClients() {
  const {form} = useFormContext<MeetingFormType>();
  const meetingClients = createMemo(
    on(
      form.data, // to nudge the form and improve reactivity
      (formData) => formData.clients.filter(({userId}) => userId),
    ),
  );
  const selectedClientIds = createMemo(() => meetingClients().map(({userId}) => userId));
  const {dataQuery: selectedClientsDataQuery} = createTQuery({
    prefixQueryKey: FacilityClient.keys.client(),
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/user/client`,
    requestCreator: staticRequestCreator((schema) => {
      const reductor = new FilterReductor(schema);
      return {
        columns: [
          {type: "column", column: "id"},
          {type: "column", column: "client.contactPhone"},
          {type: "column", column: "client.contactEmail"},
          {type: "column", column: "client.notificationMethodDictIds"},
          {type: "column", column: "client.groups.*.id"},
        ],
        filter: reductor.reduce({type: "column", column: "id", op: "in", val: selectedClientIds()}),
        sort: [],
        paging: {size: 1000},
      };
    }),
  });
  const selectedClients = createMemo((): readonly SelectedClientData[] => {
    const data = selectedClientsDataQuery.data?.data;
    if (!data) {
      return [];
    }
    return data.map((client) => ({
      id: client.id as string,
      contactPhone: (client["client.contactPhone"] as string | null) || undefined,
      contactEmail: (client["client.contactEmail"] as string | null) || undefined,
      notificationMethods: (client["client.notificationMethodDictIds"] as readonly string[]) || [],
      groupIds: (client["client.groups.*.id"] as readonly string[]) || [],
    }));
  });
  return {meetingClients, selectedClientIds, selectedClientsDataQuery, selectedClients};
}
