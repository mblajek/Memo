import {useNavigate} from "@solidjs/router";
import {useLangFunc} from "components/utils";
import {createHistoryBack} from "components/utils/history_back";
import ClientCreateForm from "features/client/ClientCreateForm";
import {VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";

export default (() => {
  const t = useLangFunc();
  const navigate = useNavigate();
  const activeFacility = useActiveFacility();
  const historyBackOr = createHistoryBack();
  return (
    <div class="p-2 flex flex-col gap-2" style={{width: "min(600px, 100%)"}}>
      <h2 class="font-bold text-xl">{t("forms.client_create.form_name")}</h2>
      <ClientCreateForm
        onSuccess={(clientId) => navigate(`/${activeFacility()?.url}/clients/${clientId}`)}
        onCancel={() => historyBackOr(`/${activeFacility()?.url}/clients`)}
      />
    </div>
  );
}) satisfies VoidComponent;
