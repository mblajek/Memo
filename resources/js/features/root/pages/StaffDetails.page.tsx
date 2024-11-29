import {useParams} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {HideableSection} from "components/ui/HideableSection";
import {BigSpinner} from "components/ui/Spinner";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {TextField} from "components/ui/form/TextField";
import {createFormLeaveConfirmation} from "components/ui/form/form_leave_confirmation";
import {DATE_TIME_FORMAT, QueryBarrier, cx, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {dateTimeLocalToISO, dateTimeToDateTimeLocal, isoToDateTimeLocal} from "components/utils/date_time_local";
import {toastSuccess} from "components/utils/toast";
import {User} from "data-access/memo-api/groups";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {StaffResourceForPatch} from "data-access/memo-api/resources/staff.resource";
import {UserDetailsHeader} from "features/facility-users/UserDetailsHeader";
import {UserMeetingsTables} from "features/facility-users/UserMeetingsTables";
import {DateTime} from "luxon";
import {Match, Show, Switch, VoidComponent, createEffect, createSignal} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";

const getSchema = () =>
  z.object({
    name: z.string().optional(),
    staff: z.object({
      isActive: z.boolean(),
      deactivatedAt: z.string(),
    }),
  });

type FormType = z.infer<ReturnType<typeof getSchema>>;

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  const status = createQuery(User.statusQueryOptions);
  const invalidate = useInvalidator();
  const formLeaveConfirmation = createFormLeaveConfirmation();
  const userId = () => params.userId!;
  const dataQuery = createQuery(() => FacilityStaff.staffMemberQueryOptions(userId()));
  const [editMode, setEditMode] = createSignal(false);
  const staffMutation = createMutation(() => ({
    mutationFn: FacilityStaff.updateStaff,
    meta: {isFormSubmit: true},
  }));

  return (
    <div class="m-2">
      <QueryBarrier queries={[dataQuery]} ignoreCachedData {...notFoundError()}>
        <Show when={dataQuery.data} fallback={<BigSpinner />}>
          {(user) => {
            async function updateStaff(values: FormType) {
              const patch: StaffResourceForPatch = {
                id: userId(),
                name: user().managedByFacilityId === activeFacilityId() ? values.name : undefined,
                staff: {
                  ...(values.staff.isActive
                    ? {
                        isActive: true,
                        deactivatedAt: dateTimeLocalToISO(values.staff.deactivatedAt),
                      }
                    : {isActive: false, deactivatedAt: null}),
                },
              };
              await staffMutation.mutateAsync(patch);
              return () => {
                toastSuccess(t("forms.client_edit.success"));
                setEditMode(false);
                invalidate.users();
              };
            }

            return (
              <div class="flex flex-col items-stretch gap-4">
                <UserDetailsHeader
                  type="staff"
                  user={{
                    ...user(),
                    createdAt: user().staff.createdAt,
                    createdBy: user().staff.createdBy,
                    updatedAt: user().staff.updatedAt,
                    updatedBy: user().staff.updatedBy,
                  }}
                />
                <FelteForm
                  id="staff_edit"
                  translationsFormNames={["staff_edit", "staff", "facility_user"]}
                  translationsModel={["staff", "facility_user"]}
                  class="flex flex-col items-stretch gap-4 relative"
                  style={{"min-width": "400px", "max-width": "600px"}}
                  schema={getSchema()}
                  onSubmit={updateStaff}
                >
                  {(form) => {
                    createEffect(() => {
                      form.setInitialValues({
                        staff: {
                          isActive: !user().staff.deactivatedAt,
                          deactivatedAt: user().staff.deactivatedAt
                            ? isoToDateTimeLocal(user().staff.deactivatedAt!)
                            : dateTimeToDateTimeLocal(DateTime.now()),
                        },
                      });
                      form.reset();
                    });
                    async function formCancel() {
                      if (!form.isDirty() || (await formLeaveConfirmation.confirm())) {
                        setEditMode(false);
                        form.reset();
                      }
                    }
                    return (
                      <>
                        <Switch>
                          <Match when={editMode()}>
                            <fieldset disabled={!editMode()} data-felte-keep-on-remove>
                              <CheckboxField name="staff.isActive" />
                              <HideableSection show={!form.data("staff.isActive")}>
                                <TextField name="staff.deactivatedAt" type="datetime-local" small />
                              </HideableSection>
                            </fieldset>
                          </Match>
                          <Match when={user().staff.deactivatedAt}>
                            {(deactivatedAt) => (
                              <div>
                                <span class="font-bold">{t("facility_user.staff.is_inactive.label")}</span>{" "}
                                {t("facility_user.staff.is_inactive.since", {
                                  date: DateTime.fromISO(deactivatedAt()).toLocaleString(DATE_TIME_FORMAT),
                                })}
                              </div>
                            )}
                          </Match>
                        </Switch>
                        <Switch>
                          <Match when={editMode()}>
                            <FelteSubmit cancel={formCancel} />
                          </Match>
                          <Match when={status.data?.permissions.facilityAdmin}>
                            <div class="flex">
                              {/* TODO: Restore the Edit button when the backend is implemented. */}
                              {/* <EditButton class="secondary small" onClick={[setEditMode, true]} /> */}
                            </div>
                          </Match>
                        </Switch>
                      </>
                    );
                  }}
                </FelteForm>
                <div class={cx("flex flex-col items-stretch gap-4", editMode() ? "hidden" : undefined)}>
                  <UserMeetingsTables
                    userName={user().name}
                    userType="staff"
                    intrinsicFilter={{
                      type: "column",
                      column: "attendant.userId",
                      op: "=",
                      val: userId(),
                    }}
                    staticPersistenceKey="staffMeetings"
                  />
                </div>
              </div>
            );
          }}
        </Show>
      </QueryBarrier>
    </div>
  );
}) satisfies VoidComponent;
