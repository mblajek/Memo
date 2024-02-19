import {Accessor, createMemo} from "solid-js";
import {Dictionaries, TypedDictionary, typedDictionary, useDictionaries} from "./dictionaries";

export function useMeetingTypeDictionary(dictionaries?: DictionariesInput) {
  return useTypedDictionary({
    dictionaries,
    dictionaryName: "meetingType",
    positionNames: ["work_time", "leave_time", "other"],
  });
}

export function useMeetingCategoryDictionary(dictionaries?: DictionariesInput) {
  return useTypedDictionary({
    dictionaries,
    dictionaryName: "meetingCategory",
    positionNames: ["other", "system"],
  });
}

export function useMeetingStatusDictionary(dictionaries?: DictionariesInput) {
  return useTypedDictionary({
    dictionaries,
    dictionaryName: "meetingStatus",
    positionNames: ["planned", "completed", "cancelled"],
  });
}

export function useAttendanceStatusDictionary(dictionaries?: DictionariesInput) {
  return useTypedDictionary({
    dictionaries,
    dictionaryName: "attendanceStatus",
    positionNames: ["ok", "cancelled", "no_show", "late_present", "too_late"],
  });
}

export function useFixedDictionaries(dictionaries?: DictionariesInput) {
  const dicts = unwrap(dictionaries);
  return {
    dictionaries: dicts,
    meetingCategoryDict: useMeetingCategoryDictionary(dicts),
    meetingTypeDict: useMeetingTypeDictionary(dicts),
    meetingStatusDict: useMeetingStatusDictionary(dicts),
    attendanceStatusDict: useAttendanceStatusDictionary(dicts),
  };
}

function useTypedDictionary<P extends string>({
  dictionaries,
  dictionaryName,
  positionNames,
}: {
  dictionaries?: DictionariesInput;
  dictionaryName: string;
  positionNames: P[];
}): Accessor<TypedDictionary<P> | undefined> {
  const dicts = unwrap(dictionaries);
  const typedDict = createMemo(() => {
    const dict = dicts()?.get(dictionaryName);
    return dict && typedDictionary(dict, positionNames);
  });
  return typedDict;
}

type DictionariesInput = Dictionaries | Accessor<Dictionaries | undefined> | undefined;

function unwrap(dicts: DictionariesInput): Accessor<Dictionaries | undefined> {
  return typeof dicts === "function" ? dicts : dicts ? () => dicts : useDictionaries();
}
