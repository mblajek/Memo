import {FilterControl} from ".";
import {DecimalFilterControl, DecimalRangeFilter} from "./DecimalFilterControl";

export const Decimal2FilterControl: FilterControl<DecimalRangeFilter> = props => {
  return <DecimalFilterControl columnType="decimal2" {...props} />;
}
