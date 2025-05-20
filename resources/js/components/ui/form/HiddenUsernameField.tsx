import {useQuery} from "@tanstack/solid-query";
import {User} from "data-access/memo-api/groups/User";
import {VoidComponent} from "solid-js";

/**
 * A hidden input field for the username, which should be included in forms that include the password
 * field, but no username field (e.g. password change field). This is for better accessibility and
 * better integration with password managers.
 *
 * https://www.chromium.org/developers/design-documents/create-amazing-password-forms/
 * TODO: Integration with Chrome password manager is still not good, investigate and fix.
 */
export const HiddenUsernameField: VoidComponent = () => {
  const statusQuery = useQuery(User.statusQueryOptions);
  return <input id="email" autocomplete="username" type="hidden" value={statusQuery.data?.user.email || undefined} />;
};
