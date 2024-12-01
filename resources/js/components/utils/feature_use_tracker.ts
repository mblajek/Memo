import {useLocation} from "@solidjs/router";
import {createMutation} from "@tanstack/solid-query";
import {useAppContext} from "app_context";
import {System} from "data-access/memo-api/groups";
import {dateTimeToISO} from "data-access/memo-api/utils";
import {DateTime, Duration} from "luxon";
import {createEffect, createSignal, on, Setter} from "solid-js";
import {richJSONSerialiser, RichJSONValue} from "../persistence/serialiser";
import {debouncedAccessor} from "./debounce";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const featureUseSetters = new Map<string, Setter<FeatureUseData<any>>>();

interface FeatureUseData<D extends RichJSONValue> {
  readonly firstTime?: DateTime;
  readonly lastTime?: DateTime;
  readonly count: number;
  readonly breakdown: ReadonlyMap<string, BreakdownItem<D>>;
}

interface BreakdownItem<D extends RichJSONValue> {
  readonly key: BreakdownKey<D>;
  readonly count: number;
}

export type BreakdownKey<D extends RichJSONValue = RichJSONValue> = {
  readonly path?: string;
  readonly details?: D;
};

export interface FeatureUseTrackerOptions {
  readonly debounce: Duration;
  readonly logAppPath: boolean;
}

const DEFAULT_OPTIONS = {
  debounce: Duration.fromObject({minutes: 2}),
  logAppPath: false,
} satisfies FeatureUseTrackerOptions;

export function useTrackFeatureUse<D extends RichJSONValue = null>(
  featureId: string,
  options: Partial<FeatureUseTrackerOptions> = {},
) {
  const fullOptions = {...DEFAULT_OPTIONS, ...options};
  const appContext = useAppContext();
  const location = useLocation();
  const serialiser = richJSONSerialiser();
  const logMutation = createMutation(() => ({mutationFn: System.log}));
  let setData = featureUseSetters.get(featureId);
  if (!setData) {
    appContext.runInAppContext(() => {
      const [data, dataSetter] = createSignal<FeatureUseData<D>>({count: 0, breakdown: new Map()});
      setData = dataSetter;
      featureUseSetters.set(featureId, setData);
      // eslint-disable-next-line solid/reactivity
      const debouncedData = debouncedAccessor(data, {timeMs: fullOptions.debounce.toMillis(), lazy: true});
      // Make sure the effect is persistent.
      createEffect(
        on(debouncedData, ({firstTime, lastTime, count, breakdown}) => {
          if (firstTime && lastTime && count) {
            let contextBreakdown: BreakdownItem<D>[] | undefined = [...breakdown.values()];
            if (
              contextBreakdown.length === 1 &&
              !fullOptions.logAppPath &&
              contextBreakdown[0]!.key.details === undefined
            ) {
              contextBreakdown = undefined;
            }
            logMutation.mutate(
              {
                logLevel: "info",
                source: System.LogAPIFrontendSource.FEATURE_USE,
                message: featureId,
                context: JSON.stringify({
                  firstTime: count === 1 ? undefined : dateTimeToISO(firstTime),
                  lastTime: dateTimeToISO(lastTime),
                  count,
                  breakdown: contextBreakdown,
                } satisfies FeatureUseContext<D>),
              },
              {
                // Reset the counts. This might lose some occurrences that happened during the mutation
                // but let's ignore that for simplicity.
                onSuccess: () => setData!({count: 0, breakdown: new Map()}),
              },
            );
          }
        }),
      );
    });
  }
  const justUsed = ((details?: D) => {
    const now = DateTime.now();
    const key: BreakdownKey<D> = {
      path: fullOptions.logAppPath ? location.pathname : undefined,
      details: details ?? undefined,
    };
    const stringKey = serialiser.serialise(key);
    setData!(({firstTime = now, count, breakdown}) => {
      const newBreakdown = new Map(breakdown);
      const breakdownItem = (newBreakdown.get(stringKey) as BreakdownItem<D> | undefined) || {key, count: 0};
      newBreakdown.set(stringKey, {...breakdownItem, count: breakdownItem.count + 1});
      return {
        firstTime,
        lastTime: now,
        count: count + 1,
        breakdown: newBreakdown,
      };
    });
  }) as (...params: D extends null ? [] : [D]) => void;
  return {justUsed};
}

export interface FeatureUseContext<D extends RichJSONValue = RichJSONValue> {
  /** First occurrence, skipped if count is 1. */
  readonly firstTime?: string;
  /** Last occurrence. */
  readonly lastTime: string;
  readonly count: number;
  /** Breakdown of the feature use by details and app path. Skipped if no details. */
  readonly breakdown?: readonly FeatureUseContextBreakdownItem<D>[];
}

export interface FeatureUseContextBreakdownItem<D extends RichJSONValue = RichJSONValue> {
  readonly key: BreakdownKey<D>;
  readonly count: number;
}
