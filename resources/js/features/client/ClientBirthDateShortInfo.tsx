import {DATE_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {JSX, Show, VoidComponent} from "solid-js";
import {useClientsData} from "./clients_data";
import {Age} from "components/ui/Age";

interface Props {
  readonly clientId: string;
  readonly wrapIn?: (content: JSX.Element) => JSX.Element;
}

export const ClientBirthDateShortInfo: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const clientsData = useClientsData();
  const clientData = () => clientsData.getById(props.clientId);
  function wrapped(content: JSX.Element) {
    return props.wrapIn ? props.wrapIn(content) : content;
  }
  return (
    <Show when={clientData()}>
      {(clientData) => (
        <Show when={clientData().birthDate} fallback={wrapped(<>{clientData().type.label}</>)}>
          {(birthDate) =>
            wrapped(
              <>
                {t("facility_user.birth_date_short", {date: birthDate().toLocaleString(DATE_FORMAT)})},{" "}
                <Age birthDate={birthDate()} />
              </>,
            )
          }
        </Show>
      )}
    </Show>
  );
};
