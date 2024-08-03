import {Accessor, createEffect} from "solid-js";
import {Serialiser} from "./serialiser";
import {Storage, localStorageStorage} from "./storage";
import {Version, isDisabledVersion, joinVersions} from "./version";

/**
 * Persists a value. First, if there is any stored value, onLoad is called with that value immediately.
 * Then, the value is observed and saved in the store whenever it changes.
 */
export function createPersistence<T, S = string>({
  value,
  onLoad,
  serialiser,
  storage,
  version = [1],
}: {
  value: Accessor<T>;
  onLoad: (value: T) => void;
  serialiser: Serialiser<T, S>;
  storage: Storage<S>;
  version?: Version;
}) {
  const fullVersion = joinVersions(version, serialiser.version);
  if (isDisabledVersion(fullVersion)) {
    return;
  }
  const stored = deserialise(serialiser, storage.load(fullVersion));
  if (stored !== undefined) {
    try {
      onLoad(stored.value);
    } catch (e) {
      console.warn("Failed to load the stored value:", stored.value);
      console.warn(e);
    }
  }
  createEffect(() => storage.store(serialiser.serialise(value()), fullVersion));
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

/** Persists a value in the local storage. */
export function createLocalStoragePersistence<T>({
  key,
  value,
  onLoad,
  serialiser,
  version,
}: {
  key: string;
  value: Accessor<T>;
  onLoad: (value: T) => void;
  serialiser: Serialiser<T>;
  version?: Version;
}) {
  return createPersistence({value, onLoad, serialiser, storage: localStorageStorage(key), version});
}
