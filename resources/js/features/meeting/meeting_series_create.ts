import {MeetingSeriesFormType, numMeetingsToSeriesLength} from "./MeetingSeriesForm";

export const defaultMeetingSeriesInitialValues = () =>
  ({
    seriesInterval: "7d",
    seriesLength: numMeetingsToSeriesLength(10),
    seriesIncludeDate: {},
  }) satisfies MeetingSeriesFormType;
