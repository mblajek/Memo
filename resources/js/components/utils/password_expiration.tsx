import {createQuery} from "@tanstack/solid-query";
import {User} from "data-access/memo-api/groups/User";
import {DateTime} from "luxon";
import {createMemo} from "solid-js";
import {currentDate} from "./time";

/** Returns the number of days left until the password expires, or infinity if it won't expire. */
export function usePasswordExpirationDays() {
  const statusQuery = createQuery(User.statusQueryOptions);
  const expiration = createMemo((): number | undefined => {
    if (!statusQuery.data) {
      return undefined;
    }
    if (!statusQuery.data.user.passwordExpireAt) {
      return Number.POSITIVE_INFINITY;
    }
    return DateTime.fromISO(statusQuery.data.user.passwordExpireAt).diff(currentDate(), "days").days;
  });
  return expiration;
}
