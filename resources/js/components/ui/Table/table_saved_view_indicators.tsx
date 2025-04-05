import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {TableViewSummary} from "components/ui/Table/table_views";
import {actionIcons} from "components/ui/icons";
import {EM_DASH} from "components/ui/symbols";
import {title, TitleDirectiveType} from "components/ui/title";
import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {FaSolidArrowsUpDown} from "solid-icons/fa";
import {createMemo, Show, splitProps, VoidComponent} from "solid-js";

type _Directives = typeof title;

export function useTableSavedViewIndicators() {
  const t = useLangFunc();
  const parts = {
    globalFilter: {
      icon: () => <actionIcons.Search class="text-current" size="1em" />,
      clearKey: "globalFilterClear",
    },
    columnVisibility: {
      icon: () => <actionIcons.Columns class="text-current" size="1em" />,
      clearKey: undefined,
    },
    columnFilters: {
      icon: () => <actionIcons.Filter class="text-current" size="1em" />,
      clearKey: "columnFiltersClear",
    },
    activeColumnGroups: {
      icon: () => (
        <span class="select-none" style={{"font-size": "1.2em"}}>
          {t("tables.column_groups.grouping_symbol")}
        </span>
      ),
      clearKey: "activeColumnGroupsClear",
    },
    sorting: {
      icon: () => <FaSolidArrowsUpDown class="text-current" size="0.9em" />,
      clearKey: undefined,
    },
  } satisfies Partial<
    Record<string, {readonly icon: VoidComponent; readonly clearKey: keyof TableViewSummary | undefined}>
  >;
  type PartName = keyof typeof parts;

  interface Summaries {
    readonly viewSummary: TableViewSummary;
    readonly deltaSummary?: TableViewSummary;
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
          props.viewSummary[props.staticPartName]
            ? [
                part.clearKey && props.viewSummary[part.clearKey] ? "text-rose-600" : "text-cyan-600",
                props.deltaSummary?.[props.staticPartName] === false ? "text-opacity-30" : undefined,
              ]
            : "text-black text-opacity-5",
        )}
        style={{width: "1em", height: "1em"}}
      >
        {part.icon()}
      </div>
    );
  };

  interface IndicatorProps extends Omit<htmlAttributes.div, "title">, Summaries {
    readonly title?: TitleDirectiveType;
  }

  const Indicator: VoidComponent<IndicatorProps> = (allProps) => {
    const [summariesProps, titleProps, divProps] = splitProps(allProps, ["viewSummary", "deltaSummary"], ["title"]);
    return (
      <div {...htmlAttributes.merge(divProps, {class: "flex items-center text-sm"})} use:title={titleProps.title}>
        <Icon {...summariesProps} staticPartName="globalFilter" />
        <Icon {...summariesProps} staticPartName="columnVisibility" />
        <Icon {...summariesProps} staticPartName="columnFilters" />
        <Icon {...summariesProps} staticPartName="activeColumnGroups" />
        <Icon {...summariesProps} staticPartName="sorting" />
      </div>
    );
  };

  interface ExplanationProps extends Summaries {}

  const Explanation: VoidComponent<ExplanationProps> = (props) => {
    const IconWithDesc: VoidComponent<{readonly staticPartName: PartName}> = (iconProps) => {
      const part = parts[iconProps.staticPartName];
      const alreadySet = () => props.deltaSummary?.[iconProps.staticPartName] === false;
      const action = createMemo(() => (part.clearKey && props.viewSummary[part.clearKey] ? "clear" : "set"));
      return (
        <Show when={props.viewSummary[iconProps.staticPartName]}>
          <div class={cx("contents", alreadySet() ? "text-grey-text" : undefined)}>
            <div class="text-right">{t(`tables.saved_views.components.${iconProps.staticPartName}`)}</div>
            <Icon staticPartName={iconProps.staticPartName} {...props} />
            <div class={alreadySet() ? undefined : "font-black"}>{EM_DASH}</div>
            <div>
              {t([
                `tables.saved_views.components.${iconProps.staticPartName}.${action()}`,
                `tables.saved_views.components.generic.${action()}`,
              ])}
              <Show when={alreadySet()}> {t("tables.saved_views.components.generic.already_set")}</Show>
            </div>
          </div>
        </Show>
      );
    };
    return (
      <Show when={props.viewSummary.anything} fallback={<EmptyValueSymbol />}>
        <div class="grid gap-x-1" style={{"grid-template-columns": "auto auto auto auto"}}>
          <IconWithDesc {...props} staticPartName="globalFilter" />
          <IconWithDesc {...props} staticPartName="columnVisibility" />
          <IconWithDesc {...props} staticPartName="columnFilters" />
          <IconWithDesc {...props} staticPartName="activeColumnGroups" />
          <IconWithDesc {...props} staticPartName="sorting" />
        </div>
      </Show>
    );
  };

  return {Indicator, Explanation};
}
