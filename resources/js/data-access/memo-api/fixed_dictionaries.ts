import {Accessor, createMemo} from "solid-js";
import {TypedDictionary, typedDictionary} from "./dictionaries";
import {useDictionaries} from "./dictionaries_and_attributes_context";

export function useFixedDictionaries() {
  const dictionaries = useDictionaries();
  function tDict<P extends string>(
    dictionaryName: string,
    positionNames: P[],
  ): Accessor<TypedDictionary<P> | undefined> {
    const typedDict = createMemo(() => {
      const dict = dictionaries()?.get(dictionaryName);
      return dict && typedDictionary(dict, positionNames);
    });
    return typedDict;
  }
  return {
    dictionaries,
    clientTypeDict: tDict("clientType", ["child", "adult"]),
    meetingCategoryDict: tDict("meetingCategory", ["other", "system"]),
    meetingTypeDict: tDict("meetingType", ["work_time", "leave_time", "other"]),
    meetingStatusDict: tDict("meetingStatus", ["planned", "completed", "cancelled"]),
    attendanceTypeDict: tDict("attendanceType", ["staff", "client"]),
    attendanceStatusDict: tDict("attendanceStatus", ["ok", "cancelled", "no_show", "late_present", "too_late"]),
  };
}
