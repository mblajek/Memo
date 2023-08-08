import {FilterControl} from ".";
import {DecimalFilterControl, DecimalRangeFilter} from "./DecimalFilterControl";

export const Decimal0FilterControl: FilterControl<DecimalRangeFilter> = (props) => (
  <DecimalFilterControl columnType="decimal0" {...props} />
);
