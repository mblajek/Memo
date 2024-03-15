import {createQuery} from "@tanstack/solid-query";
import {TQueryConfig, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {User} from "data-access/memo-api/groups";
import {Show, VoidComponent, splitProps} from "solid-js";
import {UuidSelectFilterControl} from "./UuidSelectFilterControl";
import {FilterControlProps} from "./types";

interface Props extends FilterControlProps, Pick<TQuerySelectProps, "priorityQuerySpec" | "separatePriorityItems"> {
  readonly model: string;
}

export const UuidModelFilterControl: VoidComponent<Props> = (allProps) => {
  const [props, filterProps, selectProps] = splitProps(
    allProps,
    ["model"],
    ["column", "schema", "filter", "setFilter"],
  );
  const userStatus = createQuery(User.statusQueryOptions);

  function getQuerySpec(model: string): TQueryConfig | undefined {
    switch (model) {
      case "user":
        return userStatus.data?.permissions.globalAdmin
          ? {
              entityURL: "admin/user",
              prefixQueryKey: [User.keys.all()],
            }
          : undefined;
      case "user/staff":
        // TODO: Implement.
        return undefined;
      case "user/client":
        // TODO: Implement.
        return undefined;
      default:
        return undefined;
    }
  }

  return (
    <Show when={getQuerySpec(props.model)}>
      {(querySpec) => <UuidSelectFilterControl {...filterProps} {...selectProps} querySpec={querySpec()} />}
    </Show>
  );
};
