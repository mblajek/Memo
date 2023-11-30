import {Accessor, createEffect} from "solid-js";
import {Serialiser, jsonSerialiser} from "./serialiser";
import {LocalStorageStorage, Storage} from "./storage";

/**
 * Persists a value. First, if there is any stored value, onLoad is called with that value immediately.
 * Then, the value is observed and saved in the store whenever it changes.
 */
export function createPersistence<T, S = string>({
  value,
  onLoad,
  serialiser,
  storage,
}: {
  value: Accessor<T>;
  onLoad: (value: T) => void;
  serialiser: Serialiser<T, S>;
  storage: Storage<S>;
}) {
  const stored = deserialise(serialiser, storage.load());
  if (stored) {
    try {
      onLoad(stored.value);
    } catch (e) {
      console.warn("Failed to load the stored value:", stored.value);
      console.warn(e);
    }
  }
  createEffect(() => storage.store(serialiser.serialise(value())));
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

/**
 * Persists a value in the local storage.
 */
export function createLocalStoragePersistence<T>({
  key,
  value,
  onLoad,
  serialiser = jsonSerialiser<T>(),
}: {
  key: string;
  value: Accessor<T>;
  onLoad: (value: T) => void;
  serialiser?: Serialiser<T>;
}) {
  return createPersistence({value, onLoad, serialiser, storage: new LocalStorageStorage(key)});
}
