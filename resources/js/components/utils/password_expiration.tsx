import {createQuery} from "@tanstack/solid-query";
import {User} from "data-access/memo-api/groups";
import {DateTime} from "luxon";
import {createMemo} from "solid-js";
import {currentDate} from "./time";

export type PasswordExpirationState = "expired" | "soon" | undefined;

export const PASSWORD_EXPIRATION_SOON_DAYS = 14;

export function usePasswordExpiration() {
  const statusQuery = createQuery(User.statusQueryOptions);
  const expiration = createMemo((): PasswordExpirationState => {
    if (!statusQuery.data?.user.passwordExpireAt) {
      return undefined;
    }
    const daysToExpire = DateTime.fromISO(statusQuery.data.user.passwordExpireAt).diff(currentDate(), "days").days;
    return daysToExpire <= 0 ? "expired" : daysToExpire <= PASSWORD_EXPIRATION_SOON_DAYS ? "soon" : undefined;
  });
  return expiration;
}
