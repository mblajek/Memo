import {Obj} from "@felte/core";
import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {Capitalize} from "components/ui/Capitalize";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {FieldLabel} from "components/ui/form/FieldLabel";
import {TQueryConfig, TQuerySelect} from "components/ui/form/TQuerySelect";
import {CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {cx, useLangFunc} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {MeetingAttendantResource} from "data-access/memo-api/resources/meeting.resource";
import {BiRegularPlus} from "solid-icons/bi";
import {RiSystemDeleteBin6Line} from "solid-icons/ri";
import {Index, Show, VoidComponent, createComputed, createEffect, on} from "solid-js";
import {Dynamic} from "solid-js/web";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";

export const getAttendantsSchemaPart = () => ({
  staff: getAttendantsSchema(),
  clients: getAttendantsSchema(),
});

const getAttendantsSchema = () =>
  z.array(
    z.object({
      userId: z.string(),
      attendanceStatusDictId: z.string(),
    }),
  );

interface Props {
  readonly name: "staff" | "clients";
  /** Whether to show the attendance status label. Default: true. */
  readonly showAttendanceStatusLabel?: boolean;
}

interface FormAttendantsData extends Obj {
  readonly staff: readonly MeetingAttendantResource[];
  readonly clients: readonly MeetingAttendantResource[];
}

function newItem(): MeetingAttendantResource {
  return {userId: "", attendanceStatusDictId: ""};
}

export const MeetingAttendantsFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const attendanceStatusTextByPosId = new Map<string, string>();
  createComputed(
    on(dictionaries, (dictionaries) => {
      if (!dictionaries) {
        return;
      }
      const dict = dictionaries.get("attendanceStatus");
      attendanceStatusTextByPosId.set(dict.get("present").id, t("bool_values.yes"));
      attendanceStatusTextByPosId.set(dict.get("absent").id, t("bool_values.no"));
    }),
  );
  const {form} = useFormContext<FormAttendantsData>();
  createEffect<readonly MeetingAttendantResource[]>((prevAttendants) => {
    const attendants = form.data(props.name);
    // Add an empty row at the end in the following situations:
    if (
      // there are no rows, or...
      !attendants.length ||
      // ...the last row was empty and it got filled in, but it was not the only row
      // (in case of one row, the component is in "one row mode" and doesn't add rows automatically).
      (prevAttendants &&
        attendants.length > 1 &&
        attendants.length === prevAttendants.length &&
        !prevAttendants.at(-1)?.userId &&
        attendants.at(-1)!.userId)
    ) {
      form.addField(props.name, newItem());
    }
    return attendants;
  });
  const tquerySpec = (): TQueryConfig => {
    if (props.name === "staff")
      return {
        entityURL: `facility/${activeFacilityId()}/user/staff`,
        prefixQueryKey: [FacilityStaff.keys.staff()],
      };
    if (props.name === "clients")
      return {
        entityURL: `facility/${activeFacilityId()}/user/client`,
        prefixQueryKey: [FacilityClient.keys.client()],
      };
    return props.name satisfies never;
  };

  return (
    <div class="flex flex-col items-stretch">
      <div
        class="grid gap-x-1"
        style={{
          "grid-template-columns": "auto 1fr 14rem",
          "row-gap": 0,
        }}
      >
        <div class="col-span-2">
          <FieldLabel
            fieldName={props.name}
            text={
              <Capitalize
                text={t(`forms.meeting_create.fieldNames.${props.name}__interval`, {
                  postProcess: "interval",
                  count: form.data(props.name).filter(Boolean).length,
                })}
              />
            }
          />
        </div>
        <Show when={props.showAttendanceStatusLabel !== false}>
          <FieldLabel fieldName="attendanceStatusDictId" />
        </Show>
        <div
          class="grid gap-1"
          style={{
            "grid-column": "1 / -1",
            "grid-template-columns": "subgrid",
          }}
        >
          <Index each={form.data(props.name)}>
            {(_attendant, index) => (
              <>
                <Dynamic
                  component={props.name === "staff" ? STAFF_ICONS.staffMember : CLIENT_ICONS.client}
                  class="col-start-1 min-h-big-input"
                  size="24"
                />
                <div class="grow">
                  {/* TODO: Replace with the correct select for staff/clients when backend is ready. */}
                  <TQuerySelect
                    name={`${props.name}.${index}.userId`}
                    label=""
                    querySpec={tquerySpec()}
                    nullable={false}
                  />
                </div>
                <div class="flex gap-1">
                  <div
                    class={cx("grow", {
                      "opacity-30": !form.data(`${props.name}.${index}.userId`),
                    })}
                  >
                    <DictionarySelect
                      name={`${props.name}.${index}.attendanceStatusDictId`}
                      label=""
                      dictionary="attendanceStatus"
                      itemFunc={(pos, defItem) => {
                        const item = defItem();
                        return {
                          ...item,
                          text: attendanceStatusTextByPosId.get(pos.id) || item.text,
                        };
                      }}
                      nullable
                      placeholder={EMPTY_VALUE_SYMBOL}
                      disabled={!form.data(`${props.name}.${index}.userId`)}
                    />
                  </div>
                  {/* Show delete button for filled in rows, and for the empty row (unless it's the only row). */}
                  <Show when={form.data(props.name)[index]?.userId || index}>
                    <div>
                      <Button
                        class="secondarySmall min-h-big-input"
                        title={t("actions.delete")}
                        onClick={() => form.setFields(props.name, form.data(props.name).toSpliced(index, 1))}
                      >
                        <RiSystemDeleteBin6Line class="inlineIcon text-current" />
                      </Button>
                    </div>
                  </Show>
                  {/* Show add button in the last row, unless that row is already empty. */}
                  <Show when={form.data(props.name)[index]?.userId && index === form.data(props.name).length - 1}>
                    <div>
                      <Button
                        class="secondarySmall min-h-big-input"
                        title={t(`forms.meeting.add_attendant.${props.name}`)}
                        onClick={() => form.addField(props.name, newItem(), index + 1)}
                      >
                        <BiRegularPlus class="inlineIcon text-current" />
                      </Button>
                    </div>
                  </Show>
                </div>
              </>
            )}
          </Index>
        </div>
      </div>
    </div>
  );
};

export function getAttendantsValues(values: FormAttendantsData) {
  return {
    staff: values.staff.filter(({userId}) => userId),
    clients: values.clients.filter(({userId}) => userId),
  };
}
