import {FilterControl} from ".";
import {DateTimeFilterControl, DateTimeRangeFilter} from "./DateTimeFilterControl";

export const DateFilterForDateTimeColumnControl: FilterControl<DateTimeRangeFilter> = (props) => (
  <DateTimeFilterControl useDateOnlyInputs={true} {...props} />
);
