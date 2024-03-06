import {htmlAttributes, useLangFunc} from "components/utils";
import {FormattedDateTime} from "components/utils/date_formatting";
import {DATE_TIME_FORMAT} from "components/utils/formatting";
import {CreatedUpdatedResource} from "data-access/memo-api/resources/resource";
import {DateTime} from "luxon";
import {VoidComponent, splitProps} from "solid-js";
import {UserLink} from "./UserLink";

interface Props extends htmlAttributes.div {
  readonly data: CreatedUpdatedResource;
}

export const CreatedByInfo: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["data"]);
  const t = useLangFunc();
  return (
    <div {...htmlAttributes.merge(divProps, {class: "flex flex-col items-end text-xs"})}>
      <div>
        {t("created_by")} <UserLink type="staff" userId={props.data.createdBy} />
      </div>
      <FormattedDateTime
        dateTime={DateTime.fromISO(props.data.createdAt)}
        format={{...DATE_TIME_FORMAT, weekday: "short"}}
      />
    </div>
  );
};
