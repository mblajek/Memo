import { Navigate, NavigateProps } from "@solidjs/router";
import { PermissionsResource, User } from "data-access/memo-api";
import { Match, ParentComponent, Switch, mergeProps } from "solid-js";
import { QueryBarrier } from "./QueryBarrier";

export type PermissionKey = keyof Omit<
  PermissionsResource,
  "userId" | "facilityId"
>;

export interface AccessBarrierProps {
  redirectHref?: NavigateProps["href"];
  roles?: PermissionKey[];
}

export const AccessBarrier: ParentComponent<AccessBarrierProps> = (props) => {
  const merged = mergeProps({ redirectHref: "/", roles: [] }, props);
  const statusQuery = User.useStatus();

  const accessGranted = () => {
    if (statusQuery.isSuccess)
      return merged.roles.every((role) => statusQuery.data?.permissions[role]);
    return false;
  };

  return (
    <QueryBarrier query={statusQuery} errorElement={<Navigate href="/login" />}>
      <Switch>
        <Match when={accessGranted()}>{merged.children}</Match>
        <Match when={!accessGranted()}>
          <Navigate href={merged.redirectHref} />
        </Match>
      </Switch>
    </QueryBarrier>
  );
};
