import {createQuery} from "@tanstack/solid-query";
import {TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {User} from "data-access/memo-api/groups";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {activeFacilityId} from "state/activeFacilityId.state";

export function useModelQuerySpecs() {
  const userStatus = createQuery(User.statusQueryOptions);
  const permissions = () => userStatus.data?.permissions;
  return {
    user: () => {
      if (!permissions()?.globalAdmin) {
        return undefined;
      }
      return {
        querySpec: {
          entityURL: "admin/user",
          prefixQueryKey: [User.keys.all()],
        },
      };
    },
    userStaff: () => ({
      querySpec: {
        entityURL: `facility/${activeFacilityId()}/user/staff`,
        prefixQueryKey: [FacilityStaff.keys.staff()],
      },
    }),
    userClient: () => ({
      querySpec: {
        entityURL: `facility/${activeFacilityId()}/user/client`,
        prefixQueryKey: [FacilityClient.keys.client()],
      },
    }),
  } satisfies Partial<Record<string, () => Pick<TQuerySelectProps, "querySpec"> | undefined>>;
}
