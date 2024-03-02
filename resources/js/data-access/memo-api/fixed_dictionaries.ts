import {Accessor, createMemo} from "solid-js";
import {Dictionaries, TypedDictionary, typedDictionary, useDictionaries} from "./dictionaries";

export function useFixedDictionaries(dictionaries?: DictionariesInput) {
  const dicts = unwrap(dictionaries);
  return {
    dictionaries: dicts,
    meetingCategoryDict: useTypedDictionary({
      dictionaries,
      dictionaryName: "meetingCategory",
      positionNames: ["other", "system"],
    }),
    meetingTypeDict: useTypedDictionary({
      dictionaries,
      dictionaryName: "meetingType",
      positionNames: ["work_time", "leave_time", "other"],
    }),
    meetingStatusDict: useTypedDictionary({
      dictionaries,
      dictionaryName: "meetingStatus",
      positionNames: ["planned", "completed", "cancelled"],
    }),
    attendanceTypeDict: useTypedDictionary({
      dictionaries,
      dictionaryName: "attendanceType",
      positionNames: ["staff", "client"],
    }),
    attendanceStatusDict: useTypedDictionary({
      dictionaries,
      dictionaryName: "attendanceStatus",
      positionNames: ["ok", "cancelled", "no_show", "late_present", "too_late"],
    }),
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
