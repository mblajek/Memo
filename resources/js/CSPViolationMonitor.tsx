import {useServerLog} from "components/utils/server_logging";
import {System} from "data-access/memo-api/groups/System";
import {JSONValue} from "data-access/memo-api/types";
import {VoidComponent} from "solid-js";

const MIN_LOG_INTERVAL_MILLIS = 1000;

let lastLogTime = 0;

/** Logs Content-Security-Policy violations to backend. Note that not all violations will be logged this way. */
export const CSPViolationMonitor: VoidComponent = () => {
  const serverLog = useServerLog();
  document.addEventListener("securitypolicyviolation", (violation) => {
    const now = Date.now();
    if (now - lastLogTime < MIN_LOG_INTERVAL_MILLIS) {
      return;
    }
    lastLogTime = now;
    // Extract the specific fields as JSON.
    const contextJSON: Partial<Record<string, JSONValue>> = {};
    for (const field of Object.keys(SecurityPolicyViolationEvent.prototype) as Exclude<
      keyof SecurityPolicyViolationEvent,
      keyof Event
    >[]) {
      contextJSON[field] = violation[field];
    }
    serverLog({
      logLevel: "critical",
      source: System.LogAPIFrontendSource.CSP_VIOLATION,
      message: `${violation.documentURI}\nURI ${JSON.stringify(violation.blockedURI)} violates ${violation.violatedDirective}`,
      context: JSON.stringify(contextJSON, undefined, 2),
    });
  });
  return <></>;
};
