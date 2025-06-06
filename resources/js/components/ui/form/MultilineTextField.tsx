import {useFormContext} from "components/felte-form/FelteForm";
import {createPersistence} from "components/persistence/persistence";
import {userStorageStorage} from "components/persistence/storage";
import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {RiArrowsArrowLeftSLine, RiArrowsArrowRightSLine} from "solid-icons/ri";
import {Show, VoidComponent, createSignal, splitProps} from "solid-js";
import {Button} from "../Button";
import {RichTextView} from "../RichTextView";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {title} from "../title";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";
import {LabelOverride} from "./labels";
import {TRIM_ON_BLUR, trimInput} from "./util";

type _Directives = typeof title;

export interface MultilineTextFieldProps
  extends Pick<
    htmlAttributes.textarea,
    "autofocus" | "autocomplete" | "readonly" | "onClick" | "onInput" | "onChange"
  > {
  readonly name: string;
  readonly label?: LabelOverride;
  readonly small?: boolean;
  readonly richTextPreview?: boolean;
  readonly staticPersistenceKey?: string;
  readonly initialShowPreview?: boolean;
}

type PersistentState = {
  readonly preview: boolean;
};

/** Wrapper of native HTML's `<textarea>`. Intended for use with FelteForm (handles validation messages). */
export const MultilineTextField: VoidComponent<MultilineTextFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, [
    "name",
    "label",
    "small",
    "richTextPreview",
    "staticPersistenceKey",
    "initialShowPreview",
  ]);
  const t = useLangFunc();
  const [showPreview, setShowPreview] = createSignal(props.initialShowPreview ?? true);
  const {form} = useFormContext();
  createPersistence<PersistentState>({
    storage: userStorageStorage(`RichTextFieldPreview:${props.staticPersistenceKey || "_"}`),
    onLoad: (value) => setShowPreview(value.preview),
    value: () => ({preview: showPreview()}),
    version: [1],
  });
  const text = () => {
    const value: string | undefined = form.data(props.name);
    return value ? trimInput(value) : undefined;
  };
  return (
    <FieldBox {...props}>
      <div
        class="grid"
        style={{
          "grid-template-columns": `1fr auto ${props.richTextPreview && showPreview() ? "1fr" : "0fr"}`,
          "transition": "grid-template-columns 200ms",
        }}
      >
        <textarea
          id={props.name}
          name={props.name}
          {...TRIM_ON_BLUR}
          {...htmlAttributes.merge(inputProps, {
            class: cx(
              "border border-input-border rounded aria-invalid:border-red-400 disabled:bg-disabled",
              props.small ? "h-16 min-h-small-input px-1" : "h-24 min-h-big-input px-2",
            ),
          })}
          aria-labelledby={labelIdForField(props.name)}
        />
        <Show when={props.richTextPreview}>
          <Button
            class="w-2 flex flex-col items-center rounded hover:bg-hover"
            onClick={() => setShowPreview((v) => !v)}
            title={t("preview.toggle")}
          >
            <Show
              when={showPreview()}
              fallback={
                <>
                  <RiArrowsArrowLeftSLine />
                  <RiArrowsArrowLeftSLine />
                  <RiArrowsArrowLeftSLine />
                </>
              }
            >
              <RiArrowsArrowRightSLine />
              <RiArrowsArrowRightSLine />
              <RiArrowsArrowRightSLine />
            </Show>
          </Button>
          <Show when={showPreview()}>
            <div class="w-full h-full px-1 overflow-auto" use:title={[t("preview"), {delay: [1000, undefined]}]}>
              <div class="h-0">
                <RichTextView text={text()} fallback={<EmptyValueSymbol />} />
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </FieldBox>
  );
};
