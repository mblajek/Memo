import {useMutation, useQuery} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {ByteSize} from "components/ui/ByteSize";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {HideableSection} from "components/ui/HideableSection";
import {MODAL_STYLE_PRESETS} from "components/ui/Modal";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {AUTO_SIZE_COLUMN_DEFS, createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {createConfirmation} from "components/ui/confirmation";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {actionIcons} from "components/ui/icons";
import {cx} from "components/utils/classnames";
import {DATE_TIME_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {currentTimeSecond} from "components/utils/time";
import {Timeout} from "components/utils/timeout";
import {toastSuccess} from "components/utils/toast";
import {Admin} from "data-access/memo-api/groups/Admin";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {DateTime} from "luxon";
import {Component, createEffect, createSignal, getOwner, runWithOwner, Show, untrack} from "solid-js";

const PENDING_INVALIDATE_INTERVAL_MS = 5000;
const NO_PENDING_INVALIDATE_AFTER_SECS = 5 * 60;

export default (() => {
  const t = useLangFunc();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const status = useQuery(User.statusQueryOptions);
  const systemStatusMonitor = useSystemStatusMonitor();
  const selfEnvName = () => systemStatusMonitor.lastStatus()?.appEnv;
  const invalidate = useInvalidator();
  const confirmation = createConfirmation();
  const owner = getOwner();
  const timeout = new Timeout();
  const dumpCreateMutation = useMutation(() => ({
    mutationFn: Admin.createDbDump,
    meta: {isFormSubmit: true},
  }));
  const dumpRestoreMutation = useMutation(() => ({
    mutationFn: Admin.restoreDbDump,
    meta: {isFormSubmit: true},
  }));

  async function confirmAndDump(sourceEnv: "self" | "rc") {
    if (
      await confirmation.confirm({
        title: t("forms.db_dump_create.form_name"),
        body: t(`forms.db_dump_create.body.${sourceEnv}`, {env: selfEnvName()}),
      })
    ) {
      try {
        await dumpCreateMutation.mutateAsync({isFromRc: sourceEnv === "rc"});
        toastSuccess(t("forms.db_dump_create.success"));
      } finally {
        invalidate.dbDumps();
      }
    }
  }

  async function confirmAndRestore(dump: DumpInfo) {
    await runWithOwner(owner, async () => {
      const [env, setEnv] = createSignal<"self" | "rc">("rc");
      createEffect(() => {
        if (status.data && !status.data.permissions.developer) {
          setEnv("rc");
        }
      });
      const createdAt = DateTime.fromISO(dump.createdAt);
      if (
        await confirmation.confirm({
          title: t("forms.db_dump_restore.form_name"),
          body: () => (
            <div class="flex flex-col gap-2">
              <div class="whitespace-pre-wrap">
                {t("forms.db_dump_restore.form_info.dump_info", {
                  fromEnv: dump.fromEnv,
                  createdAt: createdAt.toLocaleString({...DATE_TIME_FORMAT, weekday: "long"}),
                  createdAtRelative: createdAt.toRelative({base: currentTimeSecond()}),
                })}
              </div>
              <Show
                when={status.data?.permissions.developer}
                fallback={<div>{t("forms.db_dump_restore.form_info.env.rc_only")}</div>}
              >
                <SegmentedControl
                  name="toEnv"
                  items={[
                    {value: "rc", label: () => t("forms.db_dump_restore.form_info.env.rc")},
                    {
                      value: "self",
                      label: () => t("forms.db_dump_restore.form_info.env.self", {env: selfEnvName()}),
                    },
                  ]}
                  value={env()}
                  onValueChange={setEnv}
                />
                <HideableSection show={dump.isFromRc && env() === "self"}>
                  <div class="font-semibold text-red-700">
                    {t("forms.db_dump_restore.form_info.dump_info.rc_to_self_warning", {env: selfEnvName()})}
                  </div>
                </HideableSection>
              </Show>
              <div class={cx("font-bold", env() === "self" ? "text-red-700" : undefined)}>
                {t(`forms.db_dump_restore.form_info.warn.${env()}`, {env: selfEnvName()})}
              </div>
              <div>{t("forms.db_dump_restore.form_info.question")}</div>
            </div>
          ),
          modalStyle: MODAL_STYLE_PRESETS.medium,
          mode: "danger",
        })
      ) {
        try {
          // eslint-disable-next-line solid/reactivity
          const isToRc = env() === "rc";
          await dumpRestoreMutation.mutateAsync({id: dump.id, isToRc});
          toastSuccess(t("forms.db_dump_restore.success"));
        } finally {
          invalidate.dbDumps();
        }
      }
    });
  }

  interface DumpInfo {
    readonly id: string;
    readonly isFromRc: boolean;
    readonly fromEnv: string;
    readonly createdAt: string;
  }

  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={Admin.keys.dbDump()}
      staticEntityURL="admin/db-dump"
      staticTranslations={createTableTranslations("db_dump")}
      staticPersistenceKey="adminDBDumps"
      intrinsicSort={[{type: "column", column: "createdAt", desc: true}]}
      columns={[
        {name: "id", initialVisible: false},
        ...getCreatedUpdatedColumns({globalAdmin: true, overrides: {initialVisible: true}}).slice(0, 2),
        {name: "fromEnv", columnDef: {size: 150}},
        {name: "createStatus", columnDef: {size: 150}},
        {name: "name", initialVisible: false},
        {
          name: "fileSize",
          columnDef: {
            cell: cellFunc<number>((props) => (
              <PaddedCell class="text-end">
                <ShowCellVal v={props.v}>{(v) => <ByteSize bytes={v()} />}</ShowCellVal>
              </PaddedCell>
            )),
          },
        },
        {name: "appVersion", columnDef: {size: 150}},
        {name: "isBackedUp"},
        {name: "lastRestoreStatus", columnDef: {size: 150}},
        {name: "restoredSelfAt"},
        {name: "restoredRcAt"},
        ...getCreatedUpdatedColumns({globalAdmin: true}).slice(2),
        {
          name: "actions",
          isDataColumn: false,
          extraDataColumns: ["id", "createStatus", "lastRestoreStatus", "isFromRc", "fromEnv", "updatedAt"],
          columnDef: {
            cell: (c) => {
              // A somewhat ugly way to refresh the pending operations periodically.
              untrack(() => {
                if (c.row.original.createStatus === "pending" || c.row.original.lastRestoreStatus === "pending") {
                  const updatedAt = DateTime.fromISO(c.row.original.updatedAt);
                  if (currentTimeSecond().diff(updatedAt, "seconds").seconds <= NO_PENDING_INVALIDATE_AFTER_SECS) {
                    timeout.set(() => invalidate.dbDumps(), PENDING_INVALIDATE_INTERVAL_MS);
                  }
                }
              });
              return (
                <PaddedCell>
                  <Show when={c.row.original.createStatus === "ok"} fallback={<EmptyValueSymbol />}>
                    <Button class="minimal" onClick={() => void confirmAndRestore(c.row.original)}>
                      <actionIcons.DB class="inlineIcon" /> {t("actions.db_dump.restore")}
                    </Button>
                  </Show>
                </PaddedCell>
              );
            },
            enableSorting: false,
            enableHiding: false,
            ...AUTO_SIZE_COLUMN_DEFS,
          },
        },
      ]}
      initialSort={[{id: "createdAt", desc: true}]}
      pageInfo={{href: "/help/db-dumps"}}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <PopOver
            trigger={(popOver) => (
              <Button class="secondary small" onClick={popOver.open}>
                <actionIcons.DBDump class="inlineIcon" /> {t("actions.db_dump.create")}
              </Button>
            )}
          >
            {(popOver) => (
              <SimpleMenu onClick={popOver.close}>
                <Button onClick={() => void confirmAndDump("self")}>
                  {t("actions.db_dump.create.from_self", {env: selfEnvName()})}
                </Button>
                <Button onClick={() => void confirmAndDump("rc")}>{t("actions.db_dump.create.from_rc")}</Button>
              </SimpleMenu>
            )}
          </PopOver>
        </div>
      }
    />
  );
}) satisfies Component;
