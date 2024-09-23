import {createMutation} from "@tanstack/solid-query";
import {useHolidays} from "components/ui/calendar/holidays";
import {getWeekdays} from "components/ui/calendar/week_days_calculator";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {createConfirmation} from "components/ui/confirmation";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {HideableSection} from "components/ui/HideableSection";
import {MODAL_STYLE_PRESETS} from "components/ui/Modal";
import {EN_DASH} from "components/ui/symbols";
import {ThingsList} from "components/ui/ThingsList";
import {DATE_FORMAT, useLangFunc} from "components/utils";
import {toastSuccess} from "components/utils/toast";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {dateToISO} from "data-access/memo-api/utils";
import {TOptions} from "i18next";
import {DateTime, WeekdayNumbers} from "luxon";
import {Accessor, createMemo, createSignal, getOwner, runWithOwner, Show, VoidComponent} from "solid-js";

type Meeting = Pick<MeetingResource, "id" | "date">;

/** Description of an action performed on the weekly time tables. */
export interface WeeklyTimeTablesAction {
  /** The source week if work time should be cloned from it, or undefined if it should be deleted. */
  readonly sourceWeekDate: DateTime | undefined;
  /** The weeks range to which the source weeks should be cloned, or where work times should be deleted. */
  readonly targetWeeksRange: readonly [DateTime, DateTime];
  readonly weekdaysSelection: ReadonlyMap<WeekdayNumbers, Accessor<boolean>>;
}

/** Options for performing an action. */
export interface WeeklyTimeTablesActionOptions {
  /**
   * The weeks interval in the target weeks. The value 1 means every week from the target range,
   * value 2 means every other week, etc. In case of values above 1, the included weeks have the same
   * remainder as the source week if present, or the start of the target range otherwise.
   */
  readonly weeksInterval: number;
  /**
   * Whether the work times already found on the target weeks should be deleted prior to cloning
   * from the source week. If source week is undefined (deletion), only true makes sense here.
   */
  readonly deleteExisting: boolean;
  /** Whether holidays in the target weeks should be skipped, both for deletion and as target of cloning. */
  readonly skipHolidays: boolean;
}

/** A function returning meetings from the specified week. Only meetings from the active weekdays are returned. */
type MeetingsGetter = (weekDate: DateTime) => readonly Meeting[];

interface Transaction {
  readonly targetWeeks: readonly DateTime[];
  readonly numMeetingsToDelete: number;
  readonly numSourceMeetings: number;
  readonly numMeetingsToCreate: number;
  readonly tasks: readonly (() => Promise<unknown>)[];
}

export function useWeeklyTimeTablesActions() {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const holidays = useHolidays();
  const confirmation = createConfirmation();
  const owner = getOwner();
  const deleteMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.deleteMeeting,
    meta: {isFormSubmit: true},
  }));
  const cloneMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.cloneMeeting,
    meta: {isFormSubmit: true},
  }));

  function createTransaction(
    {sourceWeekDate, targetWeeksRange: [targetStart, targetEnd]}: WeeklyTimeTablesAction,
    options: WeeklyTimeTablesActionOptions,
    getMeetings: MeetingsGetter,
  ): Transaction {
    const targetWeeks: DateTime[] = [];
    let week = targetStart;
    if (options.weeksInterval > 1 && sourceWeekDate) {
      // Set the correct parity of the starting week.
      const remainder =
        ((Math.round(targetStart.diff(sourceWeekDate, "weeks").weeks) % options.weeksInterval) +
          options.weeksInterval) %
        options.weeksInterval;
      if (remainder) {
        week = week.plus({weeks: options.weeksInterval - remainder});
      }
    }
    while (week <= targetEnd) {
      targetWeeks.push(week);
      week = week.plus({weeks: options.weeksInterval});
    }
    const meetingsToDelete: string[] = [];
    if (options.deleteExisting) {
      for (const week of targetWeeks) {
        for (const meeting of getMeetings(week)) {
          if (!options.skipHolidays || !holidays.isHoliday(DateTime.fromISO(meeting.date))) {
            meetingsToDelete.push(meeting.id);
          }
        }
      }
    }
    const tasks = [];
    if (meetingsToDelete.length) {
      tasks.push(() => deleteMutation.mutateAsync({id: meetingsToDelete[0]!, request: {otherIds: meetingsToDelete}}));
    }
    let numMeetingsToCreate = 0;
    const sourceMeetings = sourceWeekDate ? getMeetings(sourceWeekDate) : [];
    for (const [dateStr, dateSourceMeetings] of Map.groupBy(sourceMeetings, (meeting) => meeting.date)) {
      const date = DateTime.fromISO(dateStr);
      let targetDates = targetWeeks.map((targetWeek) => date.plus(targetWeek.diff(sourceWeekDate!, "week")));
      if (options.skipHolidays) {
        targetDates = targetDates.filter((date) => !holidays.isHoliday(date));
      }
      if (targetDates.length) {
        numMeetingsToCreate += targetDates.length * dateSourceMeetings.length;
        const dates = targetDates.map(dateToISO);
        for (const sourceMeeting of dateSourceMeetings) {
          tasks.push(() => cloneMutation.mutateAsync({id: sourceMeeting.id, request: {dates, interval: null}}));
        }
      }
    }
    return {
      targetWeeks,
      numMeetingsToDelete: meetingsToDelete.length,
      numSourceMeetings: sourceMeetings.length,
      numMeetingsToCreate,
      tasks,
    };
  }

  async function executeTransaction(transaction: Transaction) {
    if (transaction.tasks.length) {
      try {
        await Promise.all(transaction.tasks.map((task) => task()));
      } finally {
        invalidate.facility.meetings();
      }
    }
    toastSuccess(t("facility_user.weekly_time_tables.success"));
  }

  async function confirm(action: WeeklyTimeTablesAction, getMeetings: MeetingsGetter) {
    return runWithOwner(owner, () => {
      const [weeksInterval, setWeeksInterval] = createSignal(1);
      const [deleteExisting, setDeleteExisting] = createSignal(true);
      const [skipHolidays, setSkipHolidays] = createSignal(true);
      const options = () => ({
        weeksInterval: weeksInterval(),
        deleteExisting: deleteExisting(),
        skipHolidays: skipHolidays(),
      });
      const transaction = createMemo(() => createTransaction(action, options(), getMeetings));
      function tt(subkey: string, options?: TOptions) {
        return t(
          [
            `facility_user.weekly_time_tables.confirmation.${action.sourceWeekDate ? "paste" : "delete"}.${subkey}`,
            `facility_user.weekly_time_tables.confirmation.${subkey}`,
          ],
          options,
        );
      }

      const EverySecondWeekControl: VoidComponent = () => (
        <Show when={action.targetWeeksRange[0].toMillis() !== action.targetWeeksRange[1].toMillis()}>
          <div class="self-start">
            <SegmentedControl
              name="every_second_week"
              label=""
              items={[1, 2].map((value) => ({
                value: String(value),
                label: () => tt(`target_weeks.interval.${value}`),
              }))}
              value={String(weeksInterval())}
              onValueChange={(value) => setWeeksInterval(Number(value))}
              small
            />
          </div>
        </Show>
      );

      const TargetWeeksRange: VoidComponent = () => (
        <div>
          <Show when={transaction().targetWeeks.length}>
            {tt("target_weeks.from")}{" "}
            <span class="font-semibold">{transaction().targetWeeks[0]!.toLocaleString(DATE_FORMAT)}</span>{" "}
            {tt("target_weeks.to")}{" "}
            <span class="font-semibold">
              {transaction().targetWeeks.at(-1)!.plus({days: 6}).toLocaleString(DATE_FORMAT)}
            </span>
            ,{" "}
          </Show>
          {t("calendar.units.weeks", {count: transaction().targetWeeks.length})}
        </div>
      );

      const ActiveWeekdaysInfo: VoidComponent = () => (
        <Show when={[...action.weekdaysSelection.values()].some((sel) => !sel())}>
          <div class="flex flex-col">
            <div>{tt("active_weekdays")}</div>
            <ThingsList
              things={getWeekdays()}
              map={({weekday, exampleDay}) => (
                <span
                  class={
                    action.weekdaysSelection.get(weekday)!() ? undefined : "line-through text-black text-opacity-40"
                  }
                >
                  {exampleDay.weekdayLong}
                </span>
              )}
              mode="commas"
            />
          </div>
        </Show>
      );

      const DeleteCount: VoidComponent = () => (
        <div class="flex flex-col">
          <HideableSection show={deleteExisting()}>
            <div>{tt("target_weeks.delete_count", {count: transaction().numMeetingsToDelete})}</div>
          </HideableSection>
          <HideableSection show={!deleteExisting()}>
            <div class="font-semibold text-red-700">{tt("target_weeks.no_delete_existing")}</div>
          </HideableSection>
        </div>
      );

      const SkipHolidaysControl: VoidComponent = () => (
        <CheckboxInput checked={skipHolidays()} onChecked={setSkipHolidays} label={tt("target_weeks.skip_holidays")} />
      );

      return confirmation
        .confirm({
          title: tt("title"),
          confirmText: tt("confirm"),
          mode: "warning",
          ...(action.sourceWeekDate
            ? {
                confirmDisabled: () => !transaction().numMeetingsToCreate,
                body: () => (
                  <div class="flex flex-col gap-2">
                    <div class="flex flex-col">
                      <StandaloneFieldLabel>{tt("source_week.title")}</StandaloneFieldLabel>
                      <div>
                        <span class="font-semibold">
                          {action.sourceWeekDate!.toLocaleString(DATE_FORMAT)} {EN_DASH}{" "}
                          {action.sourceWeekDate!.plus({days: 6}).toLocaleString(DATE_FORMAT)}
                        </span>
                        , {tt("source_week.entries_count", {count: transaction().numSourceMeetings})}
                      </div>
                    </div>
                    <div class="flex flex-col">
                      <StandaloneFieldLabel>{tt("target_weeks.title")}</StandaloneFieldLabel>
                      <EverySecondWeekControl />
                      <TargetWeeksRange />
                    </div>
                    <ActiveWeekdaysInfo />
                    <div class="flex flex-col">
                      <CheckboxInput
                        checked={deleteExisting()}
                        onChecked={setDeleteExisting}
                        label={tt("target_weeks.delete_existing")}
                      />
                      <DeleteCount />
                    </div>
                    <SkipHolidaysControl />
                    <div>{tt("target_weeks.paste_count", {count: transaction().numMeetingsToCreate})}</div>
                  </div>
                ),
              }
            : {
                confirmDisabled: () => !transaction().numMeetingsToDelete,
                body: () => (
                  <div class="flex flex-col gap-2">
                    <div class="flex flex-col">
                      <StandaloneFieldLabel>{tt("target_weeks.title")}</StandaloneFieldLabel>
                      <EverySecondWeekControl />
                      <TargetWeeksRange />
                    </div>
                    <ActiveWeekdaysInfo />
                    <SkipHolidaysControl />
                    <DeleteCount />
                  </div>
                ),
              }),
          modalStyle: MODAL_STYLE_PRESETS.medium,
        })
        .then(
          // eslint-disable-next-line solid/reactivity
          (confirmed) => (confirmed ? {options: options(), transaction: transaction()} : undefined),
        );
    });
  }

  async function execute(
    action: WeeklyTimeTablesAction,
    options: WeeklyTimeTablesActionOptions,
    getMeetings: MeetingsGetter,
  ) {
    return await executeTransaction(createTransaction(action, options, getMeetings));
  }

  async function confirmAndExecute(action: WeeklyTimeTablesAction, getMeetings: MeetingsGetter) {
    const conf = await confirm(action, getMeetings);
    if (conf) {
      await executeTransaction(conf.transaction);
      return true;
    }
    return false;
  }

  return {
    confirm,
    execute,
    confirmAndExecute,
  };
}
