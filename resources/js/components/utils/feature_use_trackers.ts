import {useTrackFeatureUse as useTFU} from "./feature_use_tracker";

export namespace featureUseTrackers {
  export const filterRangeSync = () => useTFU<{t: "int"} | {t: "date"; r: "day" | "month"}>("filter_range_sync");
  export const tableHorizontalScrollByHeaderHover = () => useTFU("table.horizontal_scroll_by_header_hover");
  export const tableSecondarySort = () => useTFU("table.secondary_sort");
  export const calendarWheelWithAlt = () => useTFU<{area: "allDay" | "hours" | "month"}>("calendar.wheel_with_alt");
  export const calendarTinyCalendarDoubleClick = () => useTFU("calendar.tiny_calendar_double_click");
  export const createdUpdatedInfoToggle = () => useTFU("created_updated_info_toggle");
  export const fuzzyGlobalFilterColumnPrefix = () =>
    useTFU<{comp: string; model: string; prefix: string}>("fuzzy_global_filter.column_prefix");
  export const dateTimeInputKeyUpDown = () => useTFU<{type: string}>("date_time_input.key_up_down");
}
