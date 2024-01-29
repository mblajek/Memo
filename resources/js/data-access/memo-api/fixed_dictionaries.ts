import {Accessor, createMemo} from "solid-js";
import {Dictionaries, typedDictionary, useDictionaries} from "./dictionaries";

export function useMeetingStatusDictionary(dictionaries?: Dictionaries) {
  return useTypedDictionary({
    dictionaries,
    dictionaryName: "meetingStatus",
    positionNames: ["planned", "completed", "cancelled"],
  });
}

export function useAttendanceStatusDictionary(dictionaries?: Dictionaries) {
  return useTypedDictionary({
    dictionaries,
    dictionaryName: "attendanceStatus",
    positionNames: ["ok", "cancelled", "no_show", "late_present", "too_late"],
  });
}

export function useFixedDictionaries(dictionaries?: Dictionaries) {
  return {
    meetingStatusDict: useMeetingStatusDictionary(dictionaries),
    attendanceStatusDict: useAttendanceStatusDictionary(dictionaries),
  };
}

function useTypedDictionary<P extends string>({
  dictionaries,
  dictionaryName,
  positionNames,
}: {
  dictionaries?: Dictionaries | Accessor<Dictionaries>;
  dictionaryName: string;
  positionNames: P[];
}) {
  const dicts = dictionaries
    ? typeof dictionaries === "function"
      ? dictionaries
      : () => dictionaries
    : useDictionaries();
  const dict = createMemo(() => {
    const dict = dicts()?.get(dictionaryName);
    return dict && typedDictionary(dict, positionNames);
  });
  return dict;
}
