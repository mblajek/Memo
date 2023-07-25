import {FilterControl} from ".";
import {DateTimeFilterControl, DateTimeRangeFilter} from "./DateTimeFilterControl";

export const DateFilterControl: FilterControl<DateTimeRangeFilter> = props => {
  return <DateTimeFilterControl columnType="date" {...props} />;
}
