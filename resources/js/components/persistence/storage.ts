import {Timeout} from "components/utils/timeout";
import {User} from "data-access/memo-api/groups/User";
import {OrPromise, asyncThen} from "../utils/async";
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
  load(currentVersion: Version): OrPromise<S | undefined>;
  clear(): void;
}

export interface NonVersioningStorage<S = string> {
  store(value: S): void;
  load(): OrPromise<S | undefined>;
  clear(): void;
}

/** Creates a versioning storage based on a non-versioning storage, by prepending/stripping the version information. */
export function createVersioningStorage(base: NonVersioningStorage, addedVersion?: Version): Storage {
  function getFullVersion(version: Version) {
    return joinVersions(version, addedVersion);
  }
  return {
    store(value, version) {
      const fullVersion = getFullVersion(version);
      if (!isDisabledVersion(fullVersion)) {
        base.store(createVersionedStringValue(value, fullVersion));
      }
    },
    load(currentVersion) {
      const fullVersion = getFullVersion(currentVersion);
      if (isDisabledVersion(fullVersion)) {
        return undefined;
      }
      return asyncThen(base.load(), (value) => readVersionedStringValue(value, fullVersion));
    },
    clear() {
      base.clear();
    },
  };
}

interface StorageCache {
  store(value: string | undefined): void;
  load(): {value: string | undefined} | undefined;
}

export function createCachingStorage(base: NonVersioningStorage, cache: StorageCache): NonVersioningStorage {
  return {
    store(value) {
      if (cache.load()?.value !== value) {
        cache.store(value);
        base.store(value);
      }
    },
    load() {
      const cached = cache.load();
      return cached
        ? cached.value
        : asyncThen(base.load(), (value) => {
            cache.store(value);
            return value;
          });
    },
    clear() {
      cache.store(undefined);
      base.clear();
    },
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
      store(value) {
        localStorage.setItem(fullKey, value);
      },
      load() {
        return localStorage.getItem(fullKey) ?? undefined;
      },
      clear() {
        localStorage.removeItem(fullKey);
      },
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

const USER_STORAGE_KEY_PREFIX = "persistence:";
const USER_STORAGE_INVALIDATION_INTERVAL_SECS = 5 * 60;

const USER_STORAGE_CACHE_MAP = new Map<string, StorageCache>();

function getUserStorageCache(key: string) {
  let cache = USER_STORAGE_CACHE_MAP.get(key);
  if (!cache) {
    let cached: {value: string | undefined} | undefined;
    const timeout = new Timeout();
    function setInvalidationTimeout() {
      timeout.set(invalidate, USER_STORAGE_INVALIDATION_INTERVAL_SECS * 1000);
    }
    function invalidate() {
      cached = undefined;
      setInvalidationTimeout();
    }
    cache = {
      store(value) {
        cached = {value};
        setInvalidationTimeout();
      },
      load() {
        return cached;
      },
    };
    USER_STORAGE_CACHE_MAP.set(key, cache);
  }
  return cache;
}

export function userStorageStorage(key: string): Storage {
  const fullKey = USER_STORAGE_KEY_PREFIX + key;
  return createVersioningStorage(
    createCachingStorage(
      {
        store(value) {
          User.storagePut(fullKey, value);
        },
        async load() {
          const stored = await User.storageGet(fullKey);
          return typeof stored === "string" ? stored : undefined;
        },
        clear() {
          User.storagePut(fullKey, null);
        },
      },
      getUserStorageCache(key),
    ),
  );
}
