import {useLangFunc} from "components/utils";
import {FormattedDateTime} from "components/utils/date_formatting";
import {DATE_TIME_FORMAT} from "components/utils/formatting";
import {UserResource} from "data-access/memo-api/resources/user.resource";
import {DateTime} from "luxon";
import {VoidComponent} from "solid-js";
import {UserLink} from "./UserLink";

interface Props {
  readonly user: UserResource;
}

export const CreatedByInfo: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  return (
    <div class="flex flex-col items-end text-xs">
      <div>
        {t("created_by")} <UserLink type="staff" userId={props.user.createdBy} />
      </div>
      <FormattedDateTime
        dateTime={DateTime.fromISO(props.user.createdAt)}
        format={{...DATE_TIME_FORMAT, weekday: "short"}}
      />
    </div>
  );
};
