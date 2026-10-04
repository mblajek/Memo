import {RichJSONValue} from "components/persistence/serialiser";
import type {FuzzySpecialSyntax} from "components/ui/Table/tquery_filters/fuzzy_filter";
import {useTrackFeatureUse as useTFU} from "./feature_use_tracker";

export namespace featureUseTrackers {
  const featureIds: string[] = [];

  function makeTrackerFunc<D extends RichJSONValue = null>(featureId: string) {
    featureIds.push(featureId);
    return () => useTFU<D>(featureId);
  }

  export const filterRangeSync = makeTrackerFunc<{t: "int"} | {t: "date"; r: "day" | "month"}>("filter_range_sync");
  export const tableHorizontalScrollByHeaderHover = makeTrackerFunc("table.horizontal_scroll_by_header_hover");
  export const tableSecondarySort = makeTrackerFunc("table.secondary_sort");
  export const calendarWheelWithAlt = makeTrackerFunc<{area: "allDay" | "hours" | "month"}>("calendar.wheel_with_alt");
  export const calendarTinyCalendarDoubleClick = makeTrackerFunc("calendar.tiny_calendar_double_click");
  export const createdUpdatedInfoToggle = makeTrackerFunc("created_updated_info_toggle");
  export const fuzzyGlobalFilterColumnPrefix = makeTrackerFunc<{comp: string; model: string; prefix: string}>(
    "fuzzy_global_filter.column_prefix",
  );
  export const dateTimeInputKeyUpDown = makeTrackerFunc<{type: string}>("date_time_input.key_up_down");
  export const dateTimeInputKeyDelete = makeTrackerFunc<{type: string}>("date_time_input.key_delete");
  export const fuzzyFilterSpecialSyntax = makeTrackerFunc<{
    comp: "column_filter" | "table" | "tquery_select" | "select";
    syntax: FuzzySpecialSyntax;
  }>("fuzzy_filter.special_syntax");
  export const tableColumnHideByResize = makeTrackerFunc("table.column_hide_by_resize");
  export const tableColumnVisibilityReset = makeTrackerFunc("table.column_visibility_reset");
  export const tableSavedViewsCode = makeTrackerFunc<{action: "copy" | "copy_all" | "paste" | "paste_multiple"}>(
    "table.saved_views.code",
  );
  export const calendarHeaderClickModeSwitch = makeTrackerFunc<{target: "day" | "resource" | "month_day"}>(
    "calendar.header_click_mode_switch",
  );
  export const calendarTinyCalendarHeaderClick = makeTrackerFunc<{target: "month" | "year"}>(
    "calendar.tiny_calendar_header_click",
  );

  export function getFeatureIds(): readonly string[] {
    return featureIds;
  }
}
