import {createMutation} from "@tanstack/solid-query";
import {System} from "data-access/memo-api/groups/System";
import {JSONValue} from "data-access/memo-api/types";
import {VoidComponent} from "solid-js";

/** Logs Content-Security-Policy violations to backend. Note that not all violations will be logged this way. */
export const CSPViolationMonitor: VoidComponent = () => {
  const logMutation = createMutation(() => ({mutationFn: System.log}));
  document.addEventListener("securitypolicyviolation", (violation) => {
    // Extract the specific fields as JSON.
    const contextJSON: Partial<Record<string, JSONValue>> = {};
    for (const field of Object.keys(SecurityPolicyViolationEvent.prototype) as Exclude<
      keyof SecurityPolicyViolationEvent,
      keyof Event
    >[]) {
      contextJSON[field] = violation[field];
    }
    logMutation.mutate({
      logLevel: "critical",
      source: System.LogAPIFrontendSource.CSP_VIOLATION,
      message: `${violation.documentURI}\nURI ${JSON.stringify(violation.blockedURI)} violates ${violation.violatedDirective}`,
      context: JSON.stringify(contextJSON, undefined, 2),
    });
  });
  return <></>;
};
