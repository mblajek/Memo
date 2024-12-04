import {createMutation, createQuery} from "@tanstack/solid-query";
import {toggleDEV} from "components/utils/dev_mode";
import {toastDismiss, toastError, toastSuccess} from "components/utils/toast";
import {User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {createEffect, DEV} from "solid-js";

export interface WindowWithDeveloperLogin extends Window {
  developerLogin?: (developer: boolean) => void;
}

/* eslint-disable no-console */
export function useDeveloperPermission() {
  const invalidate = useInvalidator();
  const statusQuery = createQuery(User.statusQueryOptions);
  const developerLoginMutation = createMutation(() => ({
    mutationFn: User.developerLogin,
    onSuccess() {
      invalidate.userStatusAndFacilityPermissions();
    },
  }));
  const enabled = () => statusQuery.data?.permissions.developer;
  async function enable(developer: boolean) {
    if (developer && !statusQuery.data?.permissions.globalAdmin) {
      console.debug("Cannot enable developer mode without global admin.");
      return;
    }
    const msg = developer ? "Developer login" : "Developer logout";
    const toastId = toastSuccess(() => <div class="font-mono">{msg} …</div>);
    try {
      await developerLoginMutation.mutateAsync({developer});
      toastSuccess(() => <div class="font-mono">{msg} OK</div>);
      console.debug(`${msg} OK`);
    } catch (e) {
      toastError(() => <div class="font-mono">{msg} ERROR</div>);
      console.error(`${msg} ERROR`, e);
      throw e;
    } finally {
      toastDismiss(toastId);
    }
    if (developer) {
      toggleDEV(true);
    } else if (!DEV) {
      toggleDEV(false);
    }
  }

  function developerLogin(...args: unknown[]) {
    if (args.length !== 1 || typeof args[0] !== "boolean") {
      throw new Error("Expected boolean argument");
    }
    enable(args[0]);
  }

  createEffect(() => {
    const windowWithDeveloperLogin = window as WindowWithDeveloperLogin;
    if (statusQuery.data?.permissions.globalAdmin && !windowWithDeveloperLogin.developerLogin) {
      console.debug("Call developerLogin(true) to gain developer permission.");
      windowWithDeveloperLogin.developerLogin = developerLogin;
    }
  });

  return {enabled, enable};
}
