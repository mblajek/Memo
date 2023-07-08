import { Navigate, NavigateProps } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { PermissionsResource, User } from "data-access/memo-api";
import { Match, ParentComponent, Switch, mergeProps } from "solid-js";
import { MemoLoader } from "../ui/";
import { QueryBarrier } from "./QueryBarrier";

export type PermissionKey = keyof Omit<
  PermissionsResource,
  "userId" | "facilityId"
>;

export interface AccessBarrierProps {
  /**
   * \@solidjs-router's Navigate href
   *
   * Applied, when user is not authorized to access this section
   *
   * @default '/help'
   */
  redirectHref?: NavigateProps["href"];
  /**
   * Map of roles that user must be granted in order to access this section
   * (logical AND)
   *
   * If not provided, checks for authentication state only
   *
   * @default []
   */
  roles?: PermissionKey[];
}

/**
 * Utility component that checks authentication
 * state and user's permissions
 *
 * If not authenticated, redirects to login page
 *
 * If not authorized, redirects to `props.redirectHref`
 *
 * Authorization is calculated as `AND(...props.roles)`
 */
export const AccessBarrier: ParentComponent<AccessBarrierProps> = (props) => {
  const merged = mergeProps({ redirectHref: "/help", roles: [] }, props);
  const statusQuery = createQuery(() => ({
    ...User.statusQuery,
  }));

  const accessGranted = () => {
    if (statusQuery.isSuccess)
      return merged.roles.every((role) => statusQuery.data?.permissions[role]);
    return false;
  };

  return (
    <QueryBarrier
      queries={[statusQuery]}
      errorElement={<Navigate href="/login" />}
      pendingElement={
        <div class="h-screen flex justify-center items-center">
          <MemoLoader size={300} />
        </div>
      }
    >
      <Switch>
        <Match when={accessGranted()}>{merged.children}</Match>
        <Match when={!accessGranted()}>
          <Navigate href={merged.redirectHref} />
        </Match>
      </Switch>
    </QueryBarrier>
  );
};
