import {createQuery} from "@tanstack/solid-query";
import {TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {User} from "data-access/memo-api/groups";

export function useModelQuerySpec() {
  const userStatus = createQuery(User.statusQueryOptions);
  const permissions = () => userStatus.data?.permissions;
  return (model: string): Pick<TQuerySelectProps, "querySpec"> | undefined => {
    switch (model) {
      case "user":
        if (!permissions()?.globalAdmin) {
          return undefined;
        }
        return {
          querySpec: {
            entityURL: "admin/user",
            prefixQueryKey: [User.keys.all()],
          },
        };
      case "user/staff":
        // TODO: Implement.
        return undefined;
      case "user/client":
        // TODO: Implement.
        return undefined;
      default:
        return undefined;
    }
  };
}
