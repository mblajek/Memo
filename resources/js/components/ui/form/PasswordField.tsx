import {htmlAttributes} from "components/utils";
import {AiOutlineEye, AiOutlineEyeInvisible} from "solid-icons/ai";
import {Show, VoidComponent, createComputed, createSignal, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Button} from "../Button";
import {FieldBox} from "./FieldBox";
import {TextFieldProps, TextFieldTextInput} from "./TextField";

export interface PasswordFieldProps extends TextFieldProps {
  /**
   * Whether to show the eye icon to reveal the password. If `"whileHeld"`, the password is only revealed
   * while the eye icon is held.
   */
  readonly allowShow?: boolean | "whileHeld";
}

const SHOW_TIME_SECS = 10;

/** Wrapper for HTML input with type password, optionally with an eye icon to reveal password. */
export const PasswordField: VoidComponent<PasswordFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label", "allowShow"]);
  const [showing, setShowing] = createSignal(false);
  createComputed(() => {
    if (!props.allowShow) {
      setShowing(false);
    }
  });
  let hideTimerId: ReturnType<typeof setTimeout> | undefined = undefined;
  createComputed(() => {
    if (showing()) {
      hideTimerId = setTimeout(() => setShowing(false), SHOW_TIME_SECS * 1000);
    } else {
      clearTimeout(hideTimerId);
    }
  });
  function released() {
    if (props.allowShow === "whileHeld") {
      setShowing(false);
    }
  }
  return (
    <FieldBox {...props}>
      <div class="flex items-stretch relative">
        <TextFieldTextInput
          name={props.name}
          type={showing() ? "text" : "password"}
          {...htmlAttributes.merge(inputProps, {class: "!grow !pr-6"})}
        />
        <Show when={props.allowShow}>
          <Button
            class="absolute right-0 top-0 bottom-0 px-2"
            disabled={inputProps.disabled}
            onPointerDown={() => setShowing(!showing())}
            onClick={() => setShowing(!showing())}
            onPointerUp={released}
            onPointerOut={released}
            onBlur={released}
          >
            <Dynamic component={showing() ? AiOutlineEyeInvisible : AiOutlineEye} />
          </Button>
        </Show>
      </div>
    </FieldBox>
  );
};
