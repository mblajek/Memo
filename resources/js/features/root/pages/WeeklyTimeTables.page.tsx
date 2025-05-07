import {A} from "@solidjs/router";
import {CellContext, createSolidTable, HeaderContext} from "@tanstack/solid-table";
import {createPersistence} from "components/persistence/persistence";
import {sessionStorageStorage} from "components/persistence/storage";
import {Button, ButtonProps} from "components/ui/Button";
import {useHolidays} from "components/ui/calendar/holidays";
import {getWeekdays, getWeekFromDay} from "components/ui/calendar/week_days_calculator";
import {capitalizeString} from "components/ui/Capitalize";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {DocsModalInfoIcon} from "components/ui/docs_modal";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {actionIcons, calendarIcons, facilityIcons} from "components/ui/icons";
import {InfoIcon} from "components/ui/InfoIcon";
import {getCalendarViewLinkData} from "components/ui/meetings-calendar/calendar_link";
import {CALENDAR_BACKGROUNDS} from "components/ui/meetings-calendar/colors";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {EN_DASH} from "components/ui/symbols";
import {Header} from "components/ui/Table/Header";
import {
  AUTO_SIZE_COLUMN_DEFS,
  createTableTranslations,
  getBaseTableOptions,
  Table,
  TableTranslations,
} from "components/ui/Table/Table";
import {PaddedCell} from "components/ui/Table/table_cells";
import {TextInput} from "components/ui/TextInput";
import {TimeDuration} from "components/ui/TimeDuration";
import {title} from "components/ui/title";
import {NON_NULLABLE} from "components/utils/array_filter";
import {cx} from "components/utils/classnames";
import {MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {DATE_FORMAT} from "components/utils/formatting";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {useMutationsTracker} from "components/utils/mutations_tracker";
import {currentDate, withNoThrowOnInvalid} from "components/utils/time";
import {AlignedTime} from "components/utils/time_formatting";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {dateToISO} from "data-access/memo-api/utils";
import {DateTime, WeekdayNumbers} from "luxon";
import {IconTypes} from "solid-icons";
import {FaSolidCircleDot} from "solid-icons/fa";
import {ImInfo} from "solid-icons/im";
import {IoArrowUndoOutline} from "solid-icons/io";
import {OcArrowdown2, OcMovetobottom2} from "solid-icons/oc";
import {TbNotes} from "solid-icons/tb";
import {
  Accessor,
  batch,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  Signal,
  splitProps,
  VoidComponent,
} from "solid-js";
import {Dynamic} from "solid-js/web";
import {activeFacilityId, useActiveFacility} from "state/activeFacilityId.state";
import {useWeeklyTimeTablesActions} from "./weekly_time_tables_actions";

type _Directives = typeof title;

const RESOURCE_COLUMNS = [
  "id",
  "date",
  "startDayminute",
  "durationMinutes",
  "typeDictId",
  "notes",
] as const satisfies (keyof MeetingResource)[];
const COLUMNS = [...RESOURCE_COLUMNS, "isFacilityWide"] as const;

type Meeting = Pick<MeetingResource, (typeof RESOURCE_COLUMNS)[number]> & {
  readonly isFacilityWide: boolean;
};

interface WeekData {
  readonly weekDate: DateTime;
  readonly byWeekday: Readonly<Record<WeekdayNumbers, DayData>> & readonly (DayData | undefined)[];
}

interface DayData {
  readonly day: DateTime;
  readonly workTimes: Meeting[];
  isStaffLeaveDay: boolean;
  isFacilityWorkDay: boolean;
  isFacilityLeaveDay: boolean;
  isHoliday: boolean;
}

type PersistentState = {
  readonly selection: string;
  readonly fromMonth?: string;
  readonly toMonth?: string;
};
const PERSISTENCE_VERSION = 1;

const SELECTION_FACILITY_WIDE = "f";

export default (() => {
  const t = useLangFunc();
  const holidays = useHolidays();
  const modelsQuerySpecs = useModelQuerySpecs();
  const mutationsTracker = useMutationsTracker();
  const {meetingTypeDict} = useFixedDictionaries();
  const activeFacility = useActiveFacility();
  const actions = useWeeklyTimeTablesActions();
  const [selection, setSelection] = createSignal<string>(SELECTION_FACILITY_WIDE);
  const [fromMonth, setFromMonth] = createSignal("");
  const [toMonth, setToMonth] = createSignal("");
  const weekdaysSelection = new Map<WeekdayNumbers, Signal<boolean>>();
  const weekdays = getWeekdays();
  for (const {weekday} of weekdays) {
    // eslint-disable-next-line solid/reactivity
    weekdaysSelection.set(weekday, createSignal(true));
  }
  const defaultFromMonth = createMemo(() => currentDate().minus({months: 1}).toFormat("yyyy-MM"));
  const defaultToMonth = createMemo(() => currentDate().plus({years: 1}).toFormat("yyyy-MM"));
  const isDefaultMonthsRange = () => fromMonth() === defaultFromMonth() && toMonth() === defaultToMonth();
  createEffect(() => {
    if (!fromMonth()) {
      setFromMonth(defaultFromMonth());
    }
    if (!toMonth()) {
      setToMonth(defaultToMonth());
    }
  });
  createPersistence<PersistentState>({
    storage: sessionStorageStorage(`WeeklyTimeTables:facility.${activeFacilityId()}`),
    value: () => ({
      selection: selection(),
      fromMonth: fromMonth(),
      toMonth: toMonth(),
    }),
    onLoad: (state) =>
      batch(() => {
        setSelection(state.selection);
        if (state.fromMonth) {
          setFromMonth(state.fromMonth);
        }
        if (state.toMonth) {
          setToMonth(state.toMonth);
        }
      }),
    version: [PERSISTENCE_VERSION],
  });
  const fromDate = createMemo((prev: DateTime | undefined) =>
    fromMonth()
      ? withNoThrowOnInvalid(
          // eslint-disable-next-line solid/reactivity
          () => DateTime.fromFormat(fromMonth(), "yyyy-MM").startOf("week", {useLocaleWeeks: true}),
          () => prev,
        )
      : undefined,
  );
  const toDate = createMemo((prev: DateTime | undefined) =>
    toMonth()
      ? withNoThrowOnInvalid(
          // eslint-disable-next-line solid/reactivity
          () => DateTime.fromFormat(toMonth(), "yyyy-MM").endOf("month").endOf("week", {useLocaleWeeks: true}),
          () => prev,
        )
      : undefined,
  );
  const {dataQuery} = createTQuery({
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/meeting`,
    requestCreator: staticRequestCreator(() => ({
      columns: COLUMNS.map((column) => ({type: "column", column})),
      filter: {
        type: "op",
        op: "&",
        val: [
          {
            type: "column",
            column: "typeDictId",
            op: "in",
            val: meetingTypeDict() ? [meetingTypeDict()!.work_time.id, meetingTypeDict()!.leave_time.id] : [],
          },
          selection() === SELECTION_FACILITY_WIDE
            ? {type: "column", column: "isFacilityWide", op: "=", val: true}
            : {
                type: "op",
                op: "|",
                val: [
                  {type: "column", column: "staff.*.userId", op: "has", val: selection()},
                  {type: "column", column: "isFacilityWide", op: "=", val: true},
                ],
              },
          {type: "column", column: "date", op: ">=", val: fromDate() ? dateToISO(fromDate()!) : ""},
          {type: "column", column: "date", op: "<=", val: toDate() ? dateToISO(toDate()!) : ""},
        ],
      },
      sort: [],
      paging: {size: 5000},
    })),
    dataQueryOptions: () => ({enabled: !!(meetingTypeDict() && selection() && fromMonth() && toMonth())}),
  });

  function createWeekData(weekDate: DateTime): WeekData {
    return {
      weekDate,
      byWeekday: [
        undefined,
        ...weekdays
          .sort((a, b) => a.weekday - b.weekday)
          .map(({index}) => {
            const day = weekDate.plus({days: index});
            return {
              day,
              workTimes: [],
              isStaffLeaveDay: false,
              isFacilityWorkDay: false,
              isFacilityLeaveDay: false,
              isHoliday: holidays.isHoliday(day),
            } satisfies DayData;
          }),
      ] as unknown as Record<WeekdayNumbers, DayData> & (DayData | undefined)[],
    };
  }
  const weeksDataAndSelection = createMemo<{weeksData: WeekData[]; selection: string}>((prev) => {
    const weeksByMillis = new Map<number, WeekData>();
    const meetings = dataQuery.data?.data as Meeting[] | undefined;
    if (
      meetings &&
      fromDate() &&
      toDate() &&
      // Hide data while fetching data for a new selection.
      (selection() === prev?.selection || !dataQuery.isFetching)
    ) {
      /** Predicate determining whether the specified work_time meeting is specified for the selection (facility or staff). */
      const isMainWorkTime: (meeting: Meeting) => boolean =
        selection() === SELECTION_FACILITY_WIDE
          ? (meeting) => meeting.isFacilityWide
          : (meeting) => !meeting.isFacilityWide;
      for (const meeting of meetings) {
        const day = DateTime.fromISO(meeting.date);
        const weekDate = day.startOf("week", {useLocaleWeeks: true});
        let weekData = weeksByMillis.get(weekDate.toMillis());
        if (!weekData) {
          weekData = createWeekData(weekDate);
          weeksByMillis.set(weekDate.toMillis(), weekData);
        }
        const dayData = weekData.byWeekday[day.weekday];
        if (meeting.typeDictId === meetingTypeDict()!.work_time.id) {
          if (isMainWorkTime(meeting)) {
            dayData.workTimes.push(meeting);
            dayData.workTimes.sort(
              (a, b) => a.startDayminute - b.startDayminute || a.durationMinutes - b.durationMinutes,
            );
          }
          if (meeting.isFacilityWide) {
            dayData.isFacilityWorkDay = true;
          }
        } else if (meeting.isFacilityWide) {
          dayData.isFacilityLeaveDay = true;
        } else {
          dayData.isStaffLeaveDay = true;
        }
      }
    }
    const weeksData = [];
    for (let weekDate = fromDate()!; weekDate <= toDate()!; weekDate = weekDate.plus({weeks: 1})) {
      weeksData.push(weeksByMillis.get(weekDate.toMillis()) || createWeekData(weekDate));
    }
    return {weeksData, selection: selection()};
  });
  const weeksData = () => weeksDataAndSelection().weeksData;

  const baseTranslations = createTableTranslations("time_table_weekly");
  const translations: TableTranslations = {
    ...baseTranslations,
    columnName: (column, o) =>
      column.startsWith("weekday-")
        ? DateTime.fromObject({weekday: Number(column.slice(8)) as WeekdayNumbers}).toLocaleString({weekday: "long"})
        : baseTranslations.columnName(column, o),
  };
  const [selectedWeekDate, setSelectedWeekDate] = createSignal<DateTime | undefined>(undefined, {
    equals: (a, b) => a?.toMillis() === b?.toMillis(),
  });
  createComputed(() => {
    if (
      selectedWeekDate() &&
      (!fromDate() ||
        selectedWeekDate()!.toMillis() < fromDate()!.toMillis() ||
        !toDate() ||
        selectedWeekDate()!.toMillis() > toDate()!.toMillis())
    ) {
      setSelectedWeekDate(undefined);
    }
  });
  const CenteredEmptyValueSymbol: VoidComponent = () => (
    <div class="flex justify-center">
      <EmptyValueSymbol />
    </div>
  );

  async function confirmAndExecute(
    sourceWeekDate: DateTime | undefined,
    target: DateTime | readonly [DateTime, DateTime],
  ) {
    const weekdaysSelectionGetters = new Map<WeekdayNumbers, Accessor<boolean>>();
    for (const [weekday, [getter, _setter]] of weekdaysSelection) {
      weekdaysSelectionGetters.set(weekday, getter);
    }
    if (
      await actions.confirmAndExecute(
        {
          sourceWeekDate,
          targetWeeksRange: target instanceof DateTime ? [target, target] : target,
          weekdaysSelection: weekdaysSelectionGetters,
        },
        // eslint-disable-next-line solid/reactivity
        (weekDate) =>
          weeksData()
            .find((weekData) => weekData.weekDate.toMillis() === weekDate.toMillis())
            ?.byWeekday.flatMap((dayData, index) => {
              if (index) {
                const weekday = index as WeekdayNumbers;
                return (weekdaysSelection.get(weekday)![0]() && dayData?.workTimes) || [];
              }
              return [];
            }) || [],
      )
    ) {
      setSelectedWeekDate(undefined);
    }
  }

  const table = createSolidTable({
    ...getBaseTableOptions<WeekData>({
      defaultColumn: {enableSorting: false, ...AUTO_SIZE_COLUMN_DEFS},
    }),
    get data() {
      return weeksData();
    },
    columns: [
      {
        id: "weekDate",
        accessorFn: (d) => d.weekDate,
        cell: (ctx: CellContext<WeekData, DateTime>) => {
          const week = () => getWeekFromDay(ctx.getValue());
          return (
            <PaddedCell class="flex items-center gap-1">
              <span
                use:title={`${week().start.toLocaleString(DATE_FORMAT)} ${EN_DASH} ${week().end.toLocaleString(DATE_FORMAT)}\n${t(
                  "facility_user.weekly_time_tables.click_to_show_week",
                )}`}
              >
                <A
                  {...getCalendarViewLinkData(`/${activeFacility()?.url}/admin/time-tables`, {
                    mode: "week",
                    date: week().start,
                    resources: selection() === SELECTION_FACILITY_WIDE ? undefined : [selection()],
                  })}
                >
                  {week().start.toLocaleString(DATE_FORMAT)}
                </A>
              </span>
              <Show when={week().contains(currentDate())}>
                <div use:title={capitalizeString(t("calendar.this_week"))}>
                  <FaSolidCircleDot class="text-red-700" size={10} />
                </div>
              </Show>
            </PaddedCell>
          );
        },
      },
      {
        id: "actions",
        cell: (ctx: CellContext<WeekData, never>) => {
          const weekDate = () => ctx.row.original.weekDate;
          return (
            <PaddedCell class="flex justify-center items-center">
              <Show
                when={weekDate().toMillis() !== selectedWeekDate()?.toMillis()}
                fallback={
                  <Button
                    class="minimal !px-1 my-0.5 !border-select !bg-memo-active !text-white"
                    onClick={[setSelectedWeekDate, undefined]}
                    title={t("facility_user.weekly_time_tables.selected_week_click_to_deselect")}
                  >
                    <actionIcons.Check class="text-current" size="14" />
                  </Button>
                }
              >
                <PopOver
                  trigger={(popOver) => (
                    <Button
                      class={cx("minimal !px-1 my-0.5", popOver.isOpen ? "!bg-select" : undefined)}
                      title={t("facility_user.weekly_time_tables.click_to_see_actions")}
                      onClick={popOver.open}
                    >
                      <actionIcons.ThreeDots class="text-current" />
                    </Button>
                  )}
                >
                  {(popOver) => {
                    const MenuItem: VoidComponent<
                      ButtonProps & {
                        disabledTitle?: string;
                        icon: IconTypes | readonly IconTypes[];
                        label: string;
                      }
                    > = (allProps) => {
                      const [props, buttonProps] = splitProps(allProps, ["disabledTitle", "icon", "label"]);
                      return (
                        <Button
                          {...htmlAttributes.merge(buttonProps, {class: "flex items-center gap-2"})}
                          title={buttonProps.disabled ? props.disabledTitle : undefined}
                        >
                          <div class="flex flex-col">
                            <For each={Array.isArray(props.icon) ? props.icon : [props.icon]}>
                              {(icon: IconTypes, index) => (
                                <Dynamic
                                  class={cx(index() ? "-mt-px" : undefined, buttonProps.disabled ? "opacity-50" : "")}
                                  component={icon}
                                />
                              )}
                            </For>
                          </div>
                          {props.label}
                        </Button>
                      );
                    };
                    return (
                      <SimpleMenu class="max-w-80" onClick={() => popOver.close()}>
                        <MenuItem
                          icon={actionIcons.Check}
                          label={t("facility_user.weekly_time_tables.select_week")}
                          onClick={[setSelectedWeekDate, weekDate()]}
                        />
                        <Show when={!selectedWeekDate()}>
                          <hr class="border-input-border" />
                          <MenuItem
                            icon={[actionIcons.Repeat, OcArrowdown2]}
                            label={t("facility_user.weekly_time_tables.paste_this_until_end")}
                            onClick={() => void confirmAndExecute(weekDate(), [weekDate().plus({weeks: 1}), toDate()!])}
                          />
                          <MenuItem
                            icon={actionIcons.Delete}
                            label={t("facility_user.weekly_time_tables.delete_week.this")}
                            onClick={() => void confirmAndExecute(undefined, weekDate())}
                          />
                          <MenuItem
                            icon={[actionIcons.Delete, OcArrowdown2]}
                            label={t("facility_user.weekly_time_tables.delete_week.from_this")}
                            onClick={() => void confirmAndExecute(undefined, [weekDate(), toDate()!])}
                          />
                        </Show>
                        <Show when={selectedWeekDate()}>
                          {(selectedWeekDate) => (
                            <>
                              <MenuItem
                                icon={IoArrowUndoOutline}
                                label={t("facility_user.weekly_time_tables.undo_select_week")}
                                onClick={(e) => {
                                  setSelectedWeekDate(undefined);
                                  // Don't close the menu.
                                  e.stopPropagation();
                                }}
                              />
                              <hr class="border-input-border" />
                              <MenuItem
                                icon={actionIcons.Paste}
                                label={t("facility_user.weekly_time_tables.paste_here")}
                                onClick={() => void confirmAndExecute(selectedWeekDate(), weekDate())}
                              />
                              <MenuItem
                                icon={[actionIcons.Repeat, OcMovetobottom2]}
                                label={t("facility_user.weekly_time_tables.paste_until_here")}
                                disabled={selectedWeekDate().toMillis() > weekDate().toMillis()}
                                disabledTitle={t("facility_user.weekly_time_tables.disabled_title_only_works_forward")}
                                onClick={() =>
                                  void confirmAndExecute(selectedWeekDate(), [
                                    selectedWeekDate().plus({weeks: 1}),
                                    weekDate(),
                                  ])
                                }
                              />
                              <MenuItem
                                icon={[actionIcons.Delete, OcMovetobottom2]}
                                label={t("facility_user.weekly_time_tables.delete_until_here")}
                                disabled={selectedWeekDate().toMillis() > weekDate().toMillis()}
                                disabledTitle={t("facility_user.weekly_time_tables.disabled_title_only_works_forward")}
                                onClick={() => void confirmAndExecute(undefined, [selectedWeekDate(), weekDate()])}
                              />
                            </>
                          )}
                        </Show>
                      </SimpleMenu>
                    );
                  }}
                </PopOver>
              </Show>
            </PaddedCell>
          );
        },
        minSize: 0,
      },
      ...weekdays.map(({weekday}) => {
        const [weekdaySelected, setWeekdaySelected] = weekdaysSelection.get(weekday)!;
        return {
          id: `weekday-${weekday}`,
          accessorFn: (d: WeekData) => d.byWeekday[weekday],
          header: (ctx: HeaderContext<WeekData, DayData | undefined>) => (
            <Header
              ctx={ctx}
              wrapIn={(header) => (
                <div class="flex justify-between gap-1 items-center">
                  <div class={weekdaySelected() ? undefined : "text-grey-text"}>{header}</div>
                  <CheckboxInput
                    checked={weekdaySelected()}
                    onChecked={setWeekdaySelected}
                    onDblClick={() => {
                      // Select all if no other days are selected.
                      const selectAll = [...weekdaysSelection.entries()].every(
                        ([wkd, [getter]]) => wkd === weekday || !getter(),
                      );
                      for (const [wkd, [_getter, setter]] of weekdaysSelection) {
                        setter(selectAll || wkd === weekday);
                      }
                    }}
                    title={t("facility_user.weekly_time_tables.weekday_active_checkbox")}
                  />
                </div>
              )}
            />
          ),
          cell: (ctx: CellContext<WeekData, DayData | undefined>) => (
            <Show
              when={ctx.getValue()}
              fallback={
                <PaddedCell style={{background: CALENDAR_BACKGROUNDS.mainBg}}>
                  <CenteredEmptyValueSymbol />
                </PaddedCell>
              }
            >
              {(dayData) => (
                <PaddedCell
                  class="h-full flex flex-col justify-between"
                  style={{
                    background: [
                      dayData().isFacilityWorkDay
                        ? dayData().workTimes.length
                          ? CALENDAR_BACKGROUNDS.mainWorkTime
                          : CALENDAR_BACKGROUNDS.facilityWorkTime
                        : CALENDAR_BACKGROUNDS.mainBg,
                      dayData().isFacilityLeaveDay ? CALENDAR_BACKGROUNDS.facilityLeaveTime : undefined,
                      dayData().isStaffLeaveDay ? CALENDAR_BACKGROUNDS.staffLeaveTime : undefined,
                      dayData().isHoliday ? CALENDAR_BACKGROUNDS.holiday : undefined,
                    ]
                      .reverse()
                      .filter(NON_NULLABLE)
                      .join(", "),
                  }}
                >
                  <Show when={dayData().workTimes.length} fallback={<CenteredEmptyValueSymbol />}>
                    <ul>
                      <For each={dayData().workTimes}>
                        {(meeting, index) => {
                          const conflict = () =>
                            dayData()
                              .workTimes.slice(0, index())
                              .some((m) => m.startDayminute + m.durationMinutes >= meeting.startDayminute);
                          return (
                            <li
                              class={cx(
                                "whitespace-nowrap",
                                index() ? "-mt-1" : undefined,
                                conflict() ? "text-red-600" : "text-black",
                                weekdaySelected() ? undefined : "text-opacity-20",
                              )}
                            >
                              <AlignedTime dayMinute={meeting.startDayminute} />
                              {EN_DASH}
                              <AlignedTime
                                dayMinute={(meeting.startDayminute + meeting.durationMinutes) % MAX_DAY_MINUTE}
                              />
                              <Show when={meeting.notes}>
                                <span use:title={meeting.notes}>
                                  <TbNotes class="inlineIcon strokeIcon" size="12" />
                                </span>
                              </Show>
                              <Show when={conflict()}>
                                <span use:title={t("facility_user.weekly_time_tables.overlapping")}>
                                  <calendarIcons.Conflict class="inlineIcon" size="12" />
                                </span>
                              </Show>
                            </li>
                          );
                        }}
                      </For>
                    </ul>
                  </Show>
                  <div
                    class={cx(
                      "self-end hover:text-grey-text",
                      dayData().isHoliday ||
                        (dayData().workTimes.length && !dayData().isFacilityWorkDay) ||
                        dayData().isFacilityLeaveDay ||
                        dayData().isStaffLeaveDay
                        ? "text-grey-text"
                        : "text-gray-300",
                    )}
                    style={{
                      // Use negative margins instead of absolute position to avoid overlapping the fixed table header.
                      "height": "10px",
                      "margin-bottom": "-2px",
                      "margin-top": "-8px",
                      "margin-right": "-4px",
                    }}
                    use:title={[
                      capitalizeString(dayData().day.toLocaleString({...DATE_FORMAT, weekday: "long"})) +
                        (dayData().day.hasSame(currentDate(), "day")
                          ? " " + t("parenthesised", {text: t("calendar.today")})
                          : ""),
                      weekdaySelected() ? undefined : t("facility_user.weekly_time_tables.day_notes.weekday_inactive"),
                      dayData().isHoliday ? t("facility_user.weekly_time_tables.day_notes.holiday") : undefined,
                      dayData().workTimes.length && !dayData().isFacilityWorkDay
                        ? t("facility_user.weekly_time_tables.day_notes.working_on_facility_non_working_day")
                        : undefined,
                      dayData().isFacilityLeaveDay
                        ? t("facility_user.weekly_time_tables.day_notes.facility_leave_time")
                        : undefined,
                      dayData().isStaffLeaveDay
                        ? t("facility_user.weekly_time_tables.day_notes.staff_leave_time")
                        : undefined,
                    ]
                      .filter(NON_NULLABLE)
                      .join("\n")}
                  >
                    <Show
                      when={dayData().day.hasSame(currentDate(), "day")}
                      fallback={<ImInfo class="text-current" size="10" />}
                    >
                      <FaSolidCircleDot class="text-red-700" size="10" />
                    </Show>
                  </div>
                </PaddedCell>
              )}
            </Show>
          ),
          minSize: 130,
        };
      }),
      {
        id: "totalWorkTime",
        accessorFn: (d: WeekData) => {
          let total = 0;
          for (const dayData of d.byWeekday) {
            if (dayData) {
              for (const meeting of dayData.workTimes) {
                total += meeting.durationMinutes;
              }
            }
          }
          return total;
        },
        header: (ctx: HeaderContext<WeekData, DayData | undefined>) => (
          <Header
            ctx={ctx}
            wrapIn={(header) => (
              <div class="flex gap-1 items-center">
                {header}
                <InfoIcon title={translations.columnName("totalWorkTime.desc")} />
              </div>
            )}
          />
        ),
        cell: (ctx: CellContext<WeekData, number>) => (
          <PaddedCell class="text-right">
            <Show when={ctx.getValue()} fallback={<EmptyValueSymbol />}>
              {(totalMinutes) => <TimeDuration minutes={totalMinutes()} />}
            </Show>
          </PaddedCell>
        ),
      },
    ],
    meta: {translations},
  });

  return (
    <Table
      table={table}
      mode="standalone"
      isDimmed={dataQuery.isFetching || mutationsTracker.isAnyPending()}
      aboveTable={() => (
        <div class="flex items-stretch justify-between gap-2">
          <TQuerySelect
            name="staff"
            value={selection()}
            onValueChange={setSelection}
            {...modelsQuerySpecs.userStaff()}
            topItems={(filterText) =>
              filterText
                ? undefined
                : [
                    {
                      value: SELECTION_FACILITY_WIDE,
                      text: t("meetings.facility_wide"),
                      label: () => (
                        <div class="flex items-center gap-1">
                          <facilityIcons.Facility class="pl-0.5" size="18" />
                          {t("meetings.facility_wide")}
                        </div>
                      ),
                    },
                  ]
            }
            nullable={false}
          />
          <div class="flex items-stretch gap-1">
            <TextInput
              class="w-52 px-2"
              type="month"
              value={fromMonth()}
              onInput={({target: {value}}) => setFromMonth(value)}
            />
            <div class="self-center">{EN_DASH}</div>
            <TextInput
              class="w-52 px-2"
              type="month"
              value={toMonth()}
              onInput={({target: {value}}) => setToMonth(value)}
            />
            <Button
              onClick={() => {
                setFromMonth(defaultFromMonth());
                setToMonth(defaultToMonth());
              }}
              title={t("facility_user.weekly_time_tables.reset_dates")}
            >
              <actionIcons.Reset
                class={cx("-ml-1 text-black", isDefaultMonthsRange() ? "dimmed" : undefined)}
                size="20"
              />
            </Button>
            <div class="flex items-center">
              <DocsModalInfoIcon
                href="/help/staff-time-tables-weekly.part"
                fullPageHref="/help/staff-time-tables#weekly"
                title={t("facility_user.weekly_time_tables.more_info")}
              />
            </div>
          </div>
        </div>
      )}
    />
  );
}) satisfies VoidComponent;
