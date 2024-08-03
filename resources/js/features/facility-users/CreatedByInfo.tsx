import {Button} from "components/ui/Button";
import {htmlAttributes, useLangFunc} from "components/utils";
import {FormattedDateTime} from "components/utils/date_formatting";
import {DATE_TIME_FORMAT} from "components/utils/formatting";
import {CreatedUpdatedResource} from "data-access/memo-api/resources/resource";
import {DateTime} from "luxon";
import {Show, VoidComponent, createSignal, splitProps} from "solid-js";
import {UserLink} from "./UserLink";

interface Props extends htmlAttributes.div {
  readonly data: Partial<CreatedUpdatedResource>;
}

export const CreatedByInfo: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["data"]);
  const t = useLangFunc();
  const [mode, setMode] = createSignal<"created" | "updated">("created");
  return (
    <div {...htmlAttributes.merge(divProps, {class: "flex flex-col items-end text-xs"})}>
      <div>
        <Button
          onClick={() => setMode(mode() === "created" ? "updated" : "created")}
          title={t("toggle_created_updated_info")}
        >
          {t(mode() === "created" ? "created_by" : "updated_by")}
        </Button>{" "}
        <UserLink userId={mode() === "created" ? props.data.createdBy : props.data.updatedBy} />
      </div>
      <Show when={mode() === "created" ? props.data.createdAt : props.data.updatedAt}>
        {(dateTime) => (
          <FormattedDateTime dateTime={DateTime.fromISO(dateTime())} format={{...DATE_TIME_FORMAT, weekday: "short"}} />
        )}
      </Show>
    </div>
  );
};
