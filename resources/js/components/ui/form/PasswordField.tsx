import {htmlAttributes} from "components/utils/html_attributes";
import {Timeout} from "components/utils/timeout";
import {AiOutlineEye, AiOutlineEyeInvisible} from "solid-icons/ai";
import {Show, VoidComponent, createComputed, createSignal, on, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Button} from "../Button";
import {FieldBox} from "./FieldBox";
import {TextFieldProps, TextFieldTextInput} from "./TextField";

export interface PasswordFieldProps extends TextFieldProps {
  /**
   * Whether to show the eye icon to reveal the password. If `"sensitive"`, showing the password
   * is safer, this mode is suitable e.g. for the login form. Default: false
   */
  readonly allowShow?: boolean | "sensitive";
}

const SHOW_TIME_SECS = 10;

/** Wrapper for HTML input with type password, optionally with an eye icon to reveal password. */
export const PasswordField: VoidComponent<PasswordFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label", "allowShow"]);
  const [isManualInput, setIsManualInput] = createSignal(false);
  const [input, setInput] = createSignal("");
  const showEye = () => !!input() && (props.allowShow === "sensitive" ? isManualInput() : !!props.allowShow);
  const [showing, setShowing] = createSignal(false);
  createComputed(() => {
    if (!showEye()) {
      setShowing(false);
    }
  });
  createComputed(
    on(input, (input, prevInput) => {
      if (input.length > 1) {
        if (prevInput === undefined || input.length > prevInput.length + 1) {
          setIsManualInput(false);
        }
      } else {
        setIsManualInput(true);
      }
    }),
  );
  const hideTimer = new Timeout();
  createComputed(() => {
    if (showing()) {
      hideTimer.set(() => setShowing(false), SHOW_TIME_SECS * 1000);
    } else {
      hideTimer.clear();
    }
  });
  function released() {
    if (props.allowShow === "sensitive") {
      setShowing(false);
    }
  }
  return (
    <FieldBox {...props}>
      <div class="flex items-stretch relative">
        <TextFieldTextInput
          name={props.name}
          type={showing() ? "text" : "password"}
          {...htmlAttributes.merge(inputProps, {
            class: "!grow !pr-6",
            onInput: (e) => setInput((e.target as HTMLInputElement).value),
          })}
        />
        <Show when={showEye()}>
          <Button
            class="absolute right-0 top-0 bottom-0 px-2"
            disabled={inputProps.disabled}
            onPointerDown={[setShowing, !showing()]}
            onClick={[setShowing, !showing()]}
            onPointerUp={released}
            onPointerLeave={released}
            onBlur={released}
          >
            <Dynamic component={showing() ? AiOutlineEyeInvisible : AiOutlineEye} />
          </Button>
        </Show>
      </div>
    </FieldBox>
  );
};
