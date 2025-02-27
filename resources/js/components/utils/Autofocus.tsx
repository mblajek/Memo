import {GetRefs} from "components/utils/GetRef";
import {createEffect, ParentComponent} from "solid-js";

interface Props {
  /** Whether to autofocus. Autofocus is performed whenever this becomes true. Default: true. */
  readonly autofocus?: boolean;
}

/** An element that focuses its first child element with the autofocus attribute. */
export const Autofocus: ParentComponent<Props> = (props) => {
  return (
    <GetRefs
      refs={(refs) => {
        createEffect(() => {
          if (props.autofocus ?? true) {
            for (const ref of refs) {
              const focusElem = ref.hasAttribute("autofocus") ? ref : ref.querySelector("[autofocus]");
              if (focusElem) {
                if (focusElem instanceof HTMLElement) {
                  setTimeout(() => {
                    focusElem.focus();
                    if (focusElem instanceof HTMLInputElement) {
                      focusElem.select();
                    }
                  }, 10);
                }
                break;
              }
            }
          }
        });
      }}
    >
      {props.children}
    </GetRefs>
  );
};
