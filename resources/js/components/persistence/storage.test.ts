import {describe, expect, test} from "vitest";
import {NonVersioningStorage, createVersioningStorage} from "./storage";
import {Version} from "./version";

describe("persistence storage", () => {
  function getSimpleNonVersioningStorage() {
    let value: string | undefined;
    return {
      store: (newValue) => {
        value = newValue;
      },
      load: () => value,
      clear: () => {
        value = undefined;
      },
    } satisfies NonVersioningStorage;
  }

  function getSimpleStorage(addedVersion?: Version) {
    const nonVerStorage = getSimpleNonVersioningStorage();
    return {
      ...createVersioningStorage(nonVerStorage, addedVersion),
      loadRaw: () => nonVerStorage.load(),
    };
  }

  test("versioning storage", () => {
    const s = getSimpleStorage([1, 2, 3]);
    s.store("test1", [1, 2]);
    expect(s.loadRaw()).toBe("v1,2,1,2,3;test1");
    expect(s.load([1, 2, 3])).toBeUndefined();
    expect(s.load([])).toBeUndefined();
    expect(s.load([1, 2])).toBe("test1");
    s.store("test2", [3, 1]);
    expect(s.load([1, 2])).toBeUndefined();
    expect(s.load([3, 1])).toBe("test2");
  });

  test("disabled versions", () => {
    const s1 = getSimpleStorage([1, -2, 3]);
    s1.store("test1", []);
    expect(s1.loadRaw()).toBeUndefined();

    const s2 = getSimpleStorage([1, NaN, 3]);
    s2.store("test2", [5]);
    expect(s2.loadRaw()).toBeUndefined();

    const s3 = getSimpleStorage([1, Infinity, 3]);
    s3.store("test3", [5]);
    expect(s3.loadRaw()).toBeUndefined();

    const s4 = getSimpleStorage([1, 2, 3]);
    s4.store("test4", [3, -1]);
    expect(s4.loadRaw()).toBeUndefined();
    s4.store("test4", [3, 1]);
    expect(s4.load([3, -1])).toBeUndefined();
    expect(s4.loadRaw()).toBe("v3,1,1,2,3;test4");
    expect(s4.load([3, 1])).toBe("test4");
  });
});
