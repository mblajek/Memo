import {Navigate} from "@solidjs/router";
import {useQuery} from "@tanstack/solid-query";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {PermissionsResource} from "data-access/memo-api/resources/permissions.resource";
import {BiRegularErrorAlt} from "solid-icons/bi";
import {JSX, ParentComponent, Show, VoidComponent, mergeProps, splitProps} from "solid-js";
import {MemoLoader} from "../ui/MemoLoader";
import {QueryBarrier} from "./QueryBarrier";
import {useLangFunc} from "./lang";

export type PermissionKey = Exclude<keyof PermissionsResource, "userId" | "facilityId">;

interface Props {
  /** Element rendered when access is not granted. */
  readonly fallback?: () => JSX.Element;
  /** Elements to show when query is in error state. */
  readonly error?: () => JSX.Element;
  /** Elements to show when query is in pending state. */
  readonly pending?: () => JSX.Element;
  /**
   * Map of roles that user must be granted in order to access this section
   * (logical AND)
   *
   * If not provided, checks for authentication state only
   *
   * @default []
   */
  readonly roles?: readonly PermissionKey[];
}

/**
 * Utility component that checks authentication state and user's permissions.
 * Authorization is calculated as `AND(...props.roles)`.
 * - If not authenticated, redirects to `/login`.
 * - If not authorized, renders Fallback (by default a simple message).
 * - Default Error -> redirect to `/login` page
 * - Default Pending -> `<MemoLoader />`
 */
export const AccessBarrier: ParentComponent<Props> = (allProps) => {
  const invalidate = useInvalidator();
  const defProps = mergeProps(
    {
      fallback: () => <DefaultFallback />,
      roles: [],
      error: () => {
        invalidate.resetEverything();
        return <Navigate href="/login" />;
      },
      pending: () => <MemoLoader />,
    } satisfies Partial<Props>,
    allProps,
  );
  const [queryBarrierProps, props] = splitProps(defProps, ["error", "pending"]);
  const statusQuery = useQuery(User.statusQueryOptions);
  const accessGranted = () => {
    if (!statusQuery.isSuccess) {
      return false;
    }
    const permissions = statusQuery.data.permissions as Partial<Record<PermissionKey, boolean>>;
    return props.roles?.every((role) => permissions[role]);
  };
  return (
    <QueryBarrier queries={[statusQuery]} {...queryBarrierProps}>
      <Show when={accessGranted()} fallback={props.fallback()}>
        {props.children}
      </Show>
    </QueryBarrier>
  );
};

const DefaultFallback: VoidComponent = () => {
  const t = useLangFunc();
  return (
    <p class="m-2">
      <BiRegularErrorAlt class="inlineIcon text-red-600" /> {t("no_permissions_to_view")}
    </p>
  );
};

/** An access barrier not showing any pending, error or fallback. */
export const SilentAccessBarrier: ParentComponent<Props> = (props) => (
  <AccessBarrier error={() => undefined} pending={() => undefined} fallback={() => undefined} {...props} />
);
