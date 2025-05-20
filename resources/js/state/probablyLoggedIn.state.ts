import {createSignal} from "solid-js";

// The state describing if the app believes the user is logged in. It is set based on the user status
// in the AccessBarrier, but it is also set on login and logout session, without waiting for the
// user status result.
// It can be used to enable queries that should only be made when logged in.
export const [probablyLoggedIn, setProbablyLoggedIn] = createSignal(false);
