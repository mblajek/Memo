import {useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {EditButton} from "components/ui/Button";
import {BigSpinner} from "components/ui/Spinner";
import {ATTRIBUTES_SCHEMA, AttributeFields, AttributesType} from "components/ui/form/AttributeFields";
import {QueryBarrier, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {isDEV} from "components/utils/dev_mode";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {UserDetailsHeader} from "features/facility-users/UserDetailsHeader";
import {UserMeetingsTables} from "features/facility-users/UserMeetingsTables";
import {useUserMeetingsStats} from "features/facility-users/user_meetings_stats";
import {Match, Show, Switch, VoidComponent, createSignal} from "solid-js";
import {z} from "zod";

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  const userId = () => params.userId!;
  const dataQuery = createQuery(() => FacilityClient.clientQueryOptions(userId()));
  const meetingsStats = useUserMeetingsStats("clients", userId);
  const [editMode, setEditMode] = createSignal(false);
  const [showAllAttributes, setShowAllAttributes] = createSignal(false);

  async function updateAttributes(values: {client: AttributesType}) {
    console.log(values.client);
  }

  return (
    <div class="m-2">
      <QueryBarrier queries={[dataQuery]} ignoreCachedData {...notFoundError()}>
        <Show when={dataQuery.data} fallback={<BigSpinner />}>
          {(user) => (
            <div class="flex flex-col items-stretch gap-4">
              <UserDetailsHeader type="clients" user={user()} />
              <div
                class="self-start flex flex-col items-stretch border border-gray-300 rounded-md p-1"
                style={{width: "min(600px,100%)"}}
              >
                <Show when={isDEV()}>
                  <label class="font-medium flex items-baseline gap-1">
                    <input
                      type="checkbox"
                      name="showAllAttributes"
                      class="m-px outline-1"
                      checked={showAllAttributes()}
                      onInput={() => setShowAllAttributes((v) => !v)}
                    />
                    <span>
                      <span class="text-xs">DEV</span> {t("attributes.show_all")}
                    </span>
                  </label>
                </Show>
                <FelteForm
                  id="attributes"
                  class="flex flex-col gap-3"
                  schema={z.object({client: ATTRIBUTES_SCHEMA})}
                  initialValues={user()}
                  onSubmit={updateAttributes}
                >
                  {(form) => (
                    <AttributeFields
                      model="client"
                      minRequirementLevel={showAllAttributes() ? undefined : editMode() ? "optional" : "recommended"}
                      nestFieldsUnder="client"
                      wrapIn={(props) => (
                        <>
                          <fieldset disabled={!editMode()}>{props.children}</fieldset>
                          <Switch>
                            <Match when={editMode()}>
                              <FelteSubmit
                                cancel={() => {
                                  form.reset();
                                  setEditMode(false);
                                }}
                              />
                            </Match>
                            <Match when={!editMode()}>
                              <div class="flex justify-end">
                                <EditButton class="secondary small" onClick={[setEditMode, true]} />
                              </div>
                            </Match>
                          </Switch>
                        </>
                      )}
                    />
                  )}
                </FelteForm>
              </div>
              <Show when={!editMode()}>
                <UserMeetingsTables
                  userName={user().name}
                  userType="clients"
                  intrinsicFilter={{
                    type: "column",
                    column: "attendant.userId",
                    op: "=",
                    val: userId(),
                  }}
                  staticPersistenceKey="clientMeetings"
                  userMeetingsStats={meetingsStats}
                />
              </Show>
            </div>
          )}
        </Show>
      </QueryBarrier>
    </div>
  );
}) satisfies VoidComponent;
