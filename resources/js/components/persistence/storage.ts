import {
  Version,
  createVersionedStringValue,
  isDisabledVersion,
  joinVersions,
  readVersionedStringValue,
} from "./version";

export interface Storage<S = string> {
  /** Stores the value along with the version information, or skips storing if the version is disabled. */
  store(value: S, version: Version): void;
  /**
   * Loads and returns the value. Returns undefined if no value is found or a value stored with
   * a different version is found.
   */
  load(currentVersion: Version): S | undefined;
  clear(): void;
}

export interface NonVersioningStorage<S = string> {
  store(value: S): void;
  load(): S | undefined;
  clear(): void;
}

/** Creates a versioning storage based on a non-versioning storage, by prepending/stripping the version information. */
export function createVersioningStorage(base: NonVersioningStorage, addedVersion?: Version): Storage {
  function getFullVersion(version: Version) {
    return joinVersions(version, addedVersion);
  }
  return {
    store: (value, version) => {
      const fullVersion = getFullVersion(version);
      if (!isDisabledVersion(fullVersion)) {
        base.store(createVersionedStringValue(value, fullVersion));
      }
    },
    load: (currentVersion) => {
      const fullVersion = getFullVersion(currentVersion);
      return isDisabledVersion(fullVersion) ? undefined : readVersionedStringValue(base.load(), fullVersion);
    },
    clear: () => base.clear(),
  };
}

/** The local storage key for a version component that is used in the local storage storages. */
const LOCAL_STORAGE_STORAGE_VERSION_KEY = "localStoragePersistenceVersionComp";

/** The prefix of all the persistence values in the local storage. */
const LOCAL_STORAGE_KEY_PREFIX = "persistence:";

export function localStorageStorage(key: string): Storage {
  const fullKey = LOCAL_STORAGE_KEY_PREFIX + key;
  return createVersioningStorage(
    {
      store: (value) => localStorage.setItem(fullKey, value),
      load: () => localStorage.getItem(fullKey) ?? undefined,
      clear: () => localStorage.removeItem(fullKey),
    },
    [Number(localStorage.getItem(LOCAL_STORAGE_STORAGE_VERSION_KEY) ?? 1)],
  );
}

/**
 * Clears from the local storage all the keys created as persistence values.
 * This does not clear the LOCAL_STORAGE_STORAGE_VERSION_KEY or any other keys. */
export function clearAllLocalStorageStorages() {
  const keys = Array.from(localStorage, (_v, i) => localStorage.key(i));
  for (const key of keys) {
    if (key?.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Sets a version component used for all local storage storages.
 * Setting this to -1 disables all the local storage storages. Incrementing this value invalidates all the stored values.
 */
export function setLocalStoragePersistenceVersionComponent(versionComponent: number) {
  localStorage.setItem(LOCAL_STORAGE_STORAGE_VERSION_KEY, String(versionComponent));
}
