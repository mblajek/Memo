import {DateTimeFilterControl, DateTimeRangeFilter, FilterControl} from ".";

export const DateFilterControl: FilterControl<DateTimeRangeFilter> = props => {
  return <DateTimeFilterControl columnType="date" {...props} />;
}
