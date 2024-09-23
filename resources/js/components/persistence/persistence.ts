import {Accessor, createEffect} from "solid-js";
import {asyncThen} from "../utils/async";
import {RichJSONValue, Serialiser, richJSONSerialiser} from "./serialiser";
import {Storage} from "./storage";
import {Version, isDisabledVersion, joinVersions} from "./version";

/**
 * Persists a value. First, if there is any stored value, onLoad is called with that value.
 * It is called immediately if the storage is synchronous, or asynchronously if it is asynchronous
 * (returns a promise).
 * Then, the value is observed and saved in the store whenever it changes.
 */
export function createPersistence<T extends RichJSONValue>(params: {
  value: Accessor<T>;
  onLoad: (value: T) => void;
  serialiser?: Serialiser<T>;
  storage: Storage;
  version?: Version;
}): void;
export function createPersistence<T, S = string>(params: {
  value: Accessor<T>;
  onLoad: (value: T) => void;
  serialiser: Serialiser<T, S>;
  storage: Storage<S>;
  version?: Version;
}): void;
export function createPersistence<T, S = string>({
  value,
  onLoad,
  serialiser,
  storage,
  version = [1],
}: {
  value: Accessor<T>;
  onLoad: (value: T) => void;
  serialiser?: Serialiser<T, S>;
  storage: Storage<S>;
  version?: Version;
}) {
  serialiser ||= richJSONSerialiser() as Serialiser<T, S>;
  const fullVersion = joinVersions(version, serialiser.version);
  if (isDisabledVersion(fullVersion)) {
    return;
  }
  asyncThen(storage.load(fullVersion), (loaded) => {
    const stored = deserialise<T, S>(serialiser, loaded);
    if (stored !== undefined) {
      try {
        onLoad(stored.value);
      } catch (e) {
        console.warn("Failed to load the stored value:", stored.value);
        console.warn(e);
      }
    }
    createEffect(() => storage.store(serialiser.serialise(value()), fullVersion));
  });
}

function deserialise<T, S>(serialiser: Serialiser<T, S>, storedSerialisedValue: S | undefined) {
  if (storedSerialisedValue === undefined) {
    return undefined;
  }
  try {
    return {value: serialiser.deserialise(storedSerialisedValue)};
  } catch (e) {
    console.warn("Failed to deserialise the stored value:", storedSerialisedValue);
    console.warn(e);
    return undefined;
  }
}
