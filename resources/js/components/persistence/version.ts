import {NON_NULLABLE} from "../utils";

/**
 * Version of the stored data. Data with different versions are treated as not compatible in any direction.
 *
 * Multiple numbers allows having multiple sources of the version, which will allow to invalidate the
 * stored data more easily, per browser, or globally by backend if a component of the version comes from
 * the backend.
 *
 * A version with any component being a negative number or NaN or Infinity is a *disabled version*,
 * and it is not compatible with any version, including itself, which effectively disables loading
 * data completely. This mechanism might be useful if a bug is detected.
 */
export type Version = readonly number[];

/** Makes sure the object is really a version. This function might be useful as version can come partially from untrusted sources. */
export function isVersion(version: Version | unknown): version is Version {
  return Array.isArray(version) && version.every((v) => typeof v === "number");
}

/**
 * Converts a version to a string. The string contains exactly one semicolon, as its last character,
 * to allow easy usage of the version string as a prefix of the stored value.
 */
export function getVersionString(version: Version) {
  return `v${isVersion(version) ? version.join(",") : "?"};`;
}

export function isDisabledVersion(version: Version) {
  return !isVersion(version) || version.some((v) => Number.isNaN(v) || !Number.isFinite(v) || v < 0);
}

export function joinVersions(...versions: (Version | undefined)[]): Version {
  return versions.filter(NON_NULLABLE).flat(1);
}

/** Creates a value with a version prefix. */
export function createVersionedStringValue(value: string, version: Version) {
  return getVersionString(version) + value;
}

/**
 * If the value is stored with the specified version, returns the content with version prefix stripped.
 * Otherwise returns undefined. Also returns undefined if the version is a disabled version.
 */
export function readVersionedStringValue(versionedValue: string | undefined, version: Version) {
  if (versionedValue === undefined || isDisabledVersion(version)) {
    return undefined;
  }
  const versionString = getVersionString(version);
  return versionedValue.startsWith(versionString) ? versionedValue.slice(versionString.length) : undefined;
}
