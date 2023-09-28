import {Navigate} from "@solidjs/router";
import {createQuery, useQueryClient} from "@tanstack/solid-query";
import {FacilityResource, PermissionsResource, System, User} from "data-access/memo-api";
import {ParentComponent, Show, mergeProps, Component, splitProps} from "solid-js";
import {MemoLoader} from "../ui/";
import {QueryBarrier, QueryBarrierProps} from "./QueryBarrier";

export type PermissionKey = Exclude<keyof PermissionsResource, "userId" | "facilityId">;

export interface AccessBarrierProps extends Pick<QueryBarrierProps, "Error" | "Pending"> {
  /**
   * Component rendered when access is not granted
   */
  Fallback?: Component;
  /**
   * Map of roles that user must be granted in order to access this section
   * (logical AND)
   *
   * If not provided, checks for authentication state only
   *
   * @default []
   */
  roles?: PermissionKey[];
  /**
   * FacilityUrl available in params object (useParams)
   */
  facilityUrl?: string;
}

/**
 * Utility component that checks authentication
 * state and user's permissions
 *
 * If not authenticated, redirects to `/login`
 *
 * If not authorized, renders Fallback (by default some simple reference)
 *
 * Authorization is calculated as `AND(...props.roles)`
 *
 * Default Error -> redirect to `/login` page
 *
 * Default Pending -> `<MemoLoader />`
 */
export const AccessBarrier: ParentComponent<AccessBarrierProps> = (props) => {
  const merged = mergeProps(
    {
      Fallback: () => <p>Nie masz uprawnień do tego zasobu</p>,
      roles: [],
      Error: () => <Navigate href="/login" />,
      Pending: () => (
        <div class="h-screen flex justify-center items-center">
          <MemoLoader size={300} />
        </div>
      ),
    },
    props,
  );
  const [queryBarrierProps, localProps] = splitProps(merged, ["Error", "Pending"]);

  const queryClient = useQueryClient();

  const facilityId = () =>
    queryClient
      .getQueryData<FacilityResource[]>(System.facilitiesQueryOptions().queryKey)
      ?.find(({url}) => url === localProps.facilityUrl)?.id;

  const statusQuery = createQuery(() => User.statusQueryOptions(facilityId()));

  const accessGranted = () => {
    if (statusQuery.isSuccess) return localProps.roles?.every((role) => statusQuery.data?.permissions[role]);
    return false;
  };

  return (
    <QueryBarrier queries={[statusQuery]} {...queryBarrierProps}>
      <Show when={accessGranted()} fallback={<localProps.Fallback />}>
        {merged.children}
      </Show>
    </QueryBarrier>
  );
};
