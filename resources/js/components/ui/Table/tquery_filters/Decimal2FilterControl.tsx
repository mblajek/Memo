import {FilterControl} from ".";
import {DecimalFilterControl, DecimalRangeFilter} from "./DecimalFilterControl";

export const Decimal2FilterControl: FilterControl<DecimalRangeFilter> = (props) => (
  <DecimalFilterControl columnType="decimal2" {...props} />
);
