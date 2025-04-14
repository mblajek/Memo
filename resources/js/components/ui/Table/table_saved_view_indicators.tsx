import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {TableViewFullSummary} from "components/ui/Table/table_views";
import {actionIcons} from "components/ui/icons";
import {EM_DASH} from "components/ui/symbols";
import {title, TitleDirectiveType} from "components/ui/title";
import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {FaSolidArrowsUpDown} from "solid-icons/fa";
import {createMemo, For, JSX, Show, splitProps, VoidComponent} from "solid-js";

type _Directives = typeof title;

export const TABLE_SAVED_VIEW_PARTS = [
  "columnVisibility",
  "sorting",
  "globalFilter",
  "columnFilters",
  "activeColumnGroups",
] as const;
export type PartName = (typeof TABLE_SAVED_VIEW_PARTS)[number];

export function useTableSavedViewIndicators() {
  const t = useLangFunc();
  const parts: Record<PartName, {readonly icon: () => JSX.Element}> = {
    globalFilter: {
      icon: () => <actionIcons.Search class="text-current" size="1em" />,
    },
    columnVisibility: {
      icon: () => <actionIcons.Columns class="text-current" size="1em" />,
    },
    columnFilters: {
      icon: () => <actionIcons.Filter class="text-current" size="1em" />,
    },
    activeColumnGroups: {
      icon: () => (
        <span class="select-none" style={{"font-size": "1.2em"}}>
          {t("tables.column_groups.grouping_symbol")}
        </span>
      ),
    },
    sorting: {
      icon: () => <FaSolidArrowsUpDown class="text-current" size="0.9em" />,
    },
  };

  interface Summaries {
    readonly viewSummary: TableViewFullSummary;
  }

  interface IconProps extends Summaries {
    readonly staticPartName: PartName;
  }

  const Icon: VoidComponent<IconProps> = (props) => {
    const part = parts[props.staticPartName];
    return (
      <div
        class={cx(
          "my-1 flex items-center",
          props.viewSummary.modifiesSummary[props.staticPartName]
            ? [
                props.viewSummary.modifiesClearedSummary[props.staticPartName] ? "text-cyan-600" : "text-rose-600",
                props.viewSummary.modifiesBaseSummary?.[props.staticPartName] === false ? "text-opacity-50" : undefined,
              ]
            : "text-white",
        )}
        style={{
          width: "1em",
          height: "1em",
          ...(props.viewSummary.modifiesSummary[props.staticPartName]
            ? undefined
            : {
                filter: "drop-shadow(0.1em 0.1em 0.1em #666)",
                transform: "scale(0.8)",
              }),
        }}
      >
        {part.icon()}
      </div>
    );
  };

  interface IndicatorProps extends Omit<htmlAttributes.div, "title">, Summaries {
    readonly title?: TitleDirectiveType;
  }

  const Indicator: VoidComponent<IndicatorProps> = (allProps) => {
    const [props, divProps] = splitProps(allProps, ["viewSummary", "title"]);
    return (
      <div {...htmlAttributes.merge(divProps, {class: "flex items-center text-sm"})} use:title={props.title}>
        <For each={TABLE_SAVED_VIEW_PARTS}>
          {(part) => <Icon viewSummary={props.viewSummary} staticPartName={part} />}
        </For>
      </div>
    );
  };

  interface ExplanationProps extends Summaries {}

  const Explanation: VoidComponent<ExplanationProps> = (props) => {
    const IconWithDesc: VoidComponent<{readonly staticPartName: PartName}> = (iconProps) => {
      const alreadySet = () => props.viewSummary.modifiesBaseSummary?.[iconProps.staticPartName] === false;
      const action = createMemo(() =>
        props.viewSummary.modifiesClearedSummary[iconProps.staticPartName] ? "set" : "clear",
      );
      return (
        <Show when={props.viewSummary.modifiesSummary[iconProps.staticPartName]}>
          <div class={cx("contents", alreadySet() ? "text-grey-text" : undefined)}>
            <div class="text-right">{t(`models.table_saved_view.${iconProps.staticPartName}`)}</div>
            <Icon staticPartName={iconProps.staticPartName} {...props} />
            <div>{EM_DASH}</div>
            <div>
              {t(`tables.saved_views.component_actions.${action()}`)}
              <Show when={alreadySet()}> {t("tables.saved_views.component_actions.already_set")}</Show>
            </div>
          </div>
        </Show>
      );
    };
    return (
      <Show when={props.viewSummary.modifiesSummary.any} fallback={<EmptyValueSymbol />}>
        <div class="grid gap-x-1" style={{"grid-template-columns": "auto auto auto auto"}}>
          <For each={TABLE_SAVED_VIEW_PARTS}>{(part) => <IconWithDesc {...props} staticPartName={part} />}</For>
        </div>
      </Show>
    );
  };

  return {Icon, Indicator, Explanation};
}
