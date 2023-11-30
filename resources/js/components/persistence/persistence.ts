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
  const storedValue = storage.load();
  if (storedValue !== undefined) {
    onLoad(serialiser.deserialise(storedValue));
  }
  createEffect(() => storage.store(serialiser.serialise(value())));
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
