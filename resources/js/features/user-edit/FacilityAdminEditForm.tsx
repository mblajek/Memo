import {createMutation} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {HideableSection} from "components/ui/HideableSection";
import {facilityIcons} from "components/ui/icons";
import {useLangFunc} from "components/utils/lang";
import {notFoundError} from "components/utils/NotFoundError";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {toastSuccess} from "components/utils/toast";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {Users} from "data-access/memo-api/groups/shared";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {UserResource} from "data-access/memo-api/resources/user.resource";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {Api} from "data-access/memo-api/types";
import {
  getUserBaseInfoSchema,
  getUserBaseInfoValues,
  UserBaseInfoFields,
  userBaseInfoInitialValues,
} from "features/user-edit/UserBaseInfoFields";
import {createComputed, createMemo, Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";

const getSchema = () =>
  getUserBaseInfoSchema().merge(
    z.object({
      member: z.object({
        hasFacilityAdmin: z.boolean(),
      }),
    }),
  );

type FormType = z.infer<ReturnType<typeof getSchema>>;

interface FormParams {
  readonly userId: Api.Id;
}

interface Props extends FormParams {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const FacilityAdminEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {dataQuery} = createTQuery({
    prefixQueryKey: Users.keys.user(),
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/user`,
    requestCreator: staticRequestCreator(() => ({
      columns: [
        {type: "column", column: "id"},
        {type: "column", column: "name"},
        {type: "column", column: "email"},
        {type: "column", column: "hasEmailVerified"},
        {type: "column", column: "hasPassword"},
        {type: "column", column: "passwordExpireAt"},
        {type: "column", column: "managedByFacility.id"},
        {type: "column", column: "member.isStaff"},
      ],
      filter: {type: "column", column: "id", op: "=", val: props.userId},
      sort: [],
      paging: {
        size: 1,
      },
    })),
  });
  const user = createMemo(() => {
    if (!dataQuery.data) {
      return undefined;
    }
    const user = dataQuery.data.data[0];
    if (!user) {
      return undefined;
    }
    return {
      id: user.id as string,
      name: user.name as string,
      email: (user.email as string | null) || undefined,
      hasEmailVerified: user.hasEmailVerified as boolean,
      hasPassword: user.hasPassword as boolean,
      passwordExpireAt: user.passwordExpireAt as string | null,
      managedByFacilityId: user["managedByFacility.id"] as Api.Id | null,
      isStaff: user["member.isStaff"] as boolean,
    };
  });
  const isManagedByCurrentFacility = () => user()?.managedByFacilityId === activeFacilityId();
  const invalidate = useInvalidator();
  const userMutation = createMutation(() => ({
    mutationFn: FacilityAdmin.updateFacilityAdmin,
    meta: {isFormSubmit: true},
  }));

  async function updateUser(values: FormType) {
    const oldUser = user()!;
    await userMutation.mutateAsync({
      id: oldUser.id,
      ...(isManagedByCurrentFacility() ? getUserBaseInfoValues(values, oldUser) : undefined),
      member: {
        hasFacilityAdmin: values.member.hasFacilityAdmin,
      },
    });
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t("forms.user_edit.success"));
      props.onSuccess?.();
      // Important: Invalidation should happen after calling onSuccess which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.users();
      // Invalidate facility admins.
      invalidate.facilities();
    };
  }

  const initialValues = () => {
    const u = user()! as unknown as UserResource;
    return {
      ...userBaseInfoInitialValues(u),
      member: {
        hasFacilityAdmin: true,
      },
    } satisfies FormType;
  };

  return (
    <QueryBarrier queries={[dataQuery]} ignoreCachedData {...notFoundError()}>
      <FelteForm
        id="facility_admin_edit"
        schema={getSchema()}
        translationsFormNames={["facility_admin_edit", "facility_admin", "user"]}
        translationsModel="user"
        initialValues={initialValues()}
        onSubmit={updateUser}
        onCancel={props.onCancel}
        class="flex flex-col gap-4"
      >
        {(form) => {
          const canBeFacilityAdmin = () => form.data("hasPassword");
          createComputed(() => {
            if (!canBeFacilityAdmin()) {
              form.setFields("member.hasFacilityAdmin", false);
            }
          });
          return (
            <>
              <Show
                when={isManagedByCurrentFacility()}
                fallback={<div>{t("facility_user.not_managed_by_current_facility")}</div>}
              >
                <div>
                  <facilityIcons.Facility class="inlineIcon" /> {t("facility_user.managed_by_current_facility")}
                </div>
                <UserBaseInfoFields />
              </Show>
              <div class="flex flex-col">
                <CheckboxField
                  name="member.hasFacilityAdmin"
                  disabled={!canBeFacilityAdmin()}
                  title={
                    canBeFacilityAdmin() ? undefined : t("forms.facility_admin.facility_admin_requirements_not_met")
                  }
                />
                <HideableSection show={!user()?.isStaff && !form.data("member.hasFacilityAdmin")}>
                  <div class="text-red-600 font-bold">
                    {t("forms.facility_admin.facility_admin_deactivation_warning")}
                  </div>
                </HideableSection>
              </div>
              <FelteSubmit cancel={props.onCancel} />
            </>
          );
        }}
      </FelteForm>
    </QueryBarrier>
  );
};

// For lazy loading
export default FacilityAdminEditForm;
