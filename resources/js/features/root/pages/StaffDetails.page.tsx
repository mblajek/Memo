import {useParams} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {EditButton} from "components/ui/Button";
import {HideableSection} from "components/ui/HideableSection";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {BigSpinner} from "components/ui/Spinner";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {DateField} from "components/ui/form/DateField";
import {createFormLeaveConfirmation} from "components/ui/form/form_leave_confirmation";
import {calendarIcons} from "components/ui/icons";
import {getCalendarViewLinkData} from "components/ui/meetings-calendar/calendar_link";
import {Autofocus} from "components/utils/Autofocus";
import {notFoundError} from "components/utils/NotFoundError";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {cx} from "components/utils/classnames";
import {dateTimeLocalToISO, dateTimeToDateTimeLocal, isoToDateTimeLocal} from "components/utils/date_time_local";
import {DATE_TIME_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {StaffResourceForPatch} from "data-access/memo-api/resources/staff.resource";
import {UserDetailsHeader} from "features/facility-users/UserDetailsHeader";
import {useUserMeetingsTables} from "features/facility-users/UserMeetingsTables";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {
  getUserBaseInfoSchema,
  getUserBaseInfoValues,
  UserBaseInfoFields,
  userBaseInfoInitialValues,
} from "features/user-edit/UserBaseInfoFields";
import {DateTime} from "luxon";
import {createEffect, createSignal, Match, Show, Switch, VoidComponent} from "solid-js";
import {activeFacilityId, useActiveFacility} from "state/activeFacilityId.state";
import {z} from "zod";

const getSchema = () =>
  getUserBaseInfoSchema().merge(
    z.object({
      staff: z.object({
        isActive: z.boolean(),
        deactivatedAt: z.string(),
      }),
    }),
  );

type FormType = z.infer<ReturnType<typeof getSchema>>;

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  const status = createQuery(User.statusQueryOptions);
  const invalidate = useInvalidator();
  const formLeaveConfirmation = createFormLeaveConfirmation();
  const activeFacility = useActiveFacility();
  const {UserMeetingsTables} = useUserMeetingsTables();
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
                ...getUserBaseInfoValues(values, user()),
                staff: {
                  deactivatedAt: values.staff.isActive ? null : dateTimeLocalToISO(values.staff.deactivatedAt),
                },
              };
              await staffMutation.mutateAsync(patch);
              return () => {
                toastSuccess(t("forms.staff_edit.success"));
                setEditMode(false);
                invalidate.users();
              };
            }

            return (
              <>
                <AppTitlePrefix prefix={user().name} />
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
                    translationsModel={["staff", "facility_user", "user"]}
                    class="flex flex-col items-stretch gap-4"
                    style={{"min-width": "400px", "max-width": "600px"}}
                    schema={getSchema()}
                    onSubmit={updateStaff}
                  >
                    {(form) => {
                      createEffect(() => {
                        const u = user();
                        form.setInitialValues({
                          ...userBaseInfoInitialValues(u),
                          staff: {
                            isActive: !u.staff.deactivatedAt,
                            deactivatedAt: u.staff.deactivatedAt
                              ? isoToDateTimeLocal(u.staff.deactivatedAt!)
                              : dateTimeToDateTimeLocal(DateTime.now()),
                          },
                        });
                        form.reset();
                      });
                      async function formCancel() {
                        if (!form.isDirty() || (await formLeaveConfirmation.confirm())) {
                          form.reset();
                          setEditMode(false);
                        }
                      }
                      return (
                        <>
                          <Switch>
                            <Match when={editMode()}>
                              <Autofocus>
                                <fieldset
                                  class="flex flex-col items-stretch gap-4"
                                  disabled={!editMode()}
                                  data-felte-keep-on-remove
                                >
                                  <UserBaseInfoFields origUser={user()} />
                                  <div class="flex flex-col">
                                    <CheckboxField name="staff.isActive" />
                                    <HideableSection show={!form.data("staff.isActive")}>
                                      <DateField name="staff.deactivatedAt" type="datetime-local" showWeekday />
                                    </HideableSection>
                                  </div>
                                </fieldset>
                              </Autofocus>
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
                            <Match
                              when={
                                status.data?.permissions.facilityAdmin &&
                                user().managedByFacilityId === activeFacilityId()
                              }
                            >
                              <div class="flex">
                                <EditButton class="secondary small" onClick={[setEditMode, true]} />
                              </div>
                            </Match>
                          </Switch>
                        </>
                      );
                    }}
                  </FelteForm>
                  <div class={cx("flex flex-col items-stretch gap-1", editMode() ? "hidden" : undefined)}>
                    <div class="self-end">
                      <LinkWithNewTabLink
                        {...getCalendarViewLinkData(`/${activeFacility()?.url}/calendar`, {
                          mode: ["week", "month"],
                          resources: [userId()],
                        })}
                      >
                        <calendarIcons.Calendar class="inlineIcon" /> {t("facility_user.show_calendar")}
                      </LinkWithNewTabLink>
                    </div>
                    <UserMeetingsTables
                      staticUserName={user().name}
                      staticUserType="staff"
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
              </>
            );
          }}
        </Show>
      </QueryBarrier>
    </div>
  );
}) satisfies VoidComponent;
