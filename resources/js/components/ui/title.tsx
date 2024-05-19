import {Accessor, createEffect, JSX, on, onCleanup} from "solid-js";
import tippy, {createSingleton, CreateSingletonInstance, Instance, Props as TippyProps} from "tippy.js";
import "tippy.js/animations/shift-toward-subtle.css";
import "tippy.js/dist/border.css";
import "tippy.js/dist/tippy.css";
import "./title.scss";

export type TitleDirectiveType = JSX.Element | readonly [JSX.Element, Partial<TippyProps>];

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      title: TitleDirectiveType;
    }
  }
}

/** An object that manages the current app-wide singleton tippy. */
class TippySingletonManager {
  /** The individual tippys for the elements that should show title. */
  private tippys: readonly Instance[] = [];

  private tippySingleton: CreateSingletonInstance | undefined;

  private tippySingletonRecreationTimer: ReturnType<typeof setTimeout> | undefined;

  add(newTippy: Instance) {
    this.tippys = [...this.tippys, newTippy];
    this.getTippySingleton().setInstances([...this.tippys]);
    return () => this.delete(newTippy);
  }

  delete(tippyToDelete: Instance) {
    const removeTippy = () => {
      // There seems to be a bug in the tippy library occurring when calling setInstances with a reduced
      // list of individual tippys. So instead when removing a tippy delete the singleton and recreate it.
      this.tippySingleton?.destroy();
      tippyToDelete.destroy();
      this.tippys = this.tippys.filter((t) => t !== tippyToDelete);
      this.tippySingleton = undefined;
      this.recreateTippySingleton();
    };
    if (this.tippySingleton?.state.isMounted) {
      this.tippySingleton.hide();
      setTimeout(removeTippy, 500);
    } else {
      removeTippy();
    }
  }

  getTippySingleton() {
    if (!this.tippySingleton)
      this.tippySingleton = createSingleton([...this.tippys], {
        delay: [300, 300],
        duration: 200,
        animation: "shift-toward-subtle",
        moveTransition: "transform 150ms ease",
        hideOnClick: false,
        theme: "memo",
        touch: "hold",
        offset: [0, 8],
        maxWidth: "500px",
      });
    return this.tippySingleton;
  }

  /** Recreate the tippy singleton. Debounce to avoid multiple recreations in succession. */
  private recreateTippySingleton() {
    clearTimeout(this.tippySingletonRecreationTimer);
    this.tippySingletonRecreationTimer = setTimeout(() => this.getTippySingleton(), 100);
  }
}

const tippySingletonManager = new TippySingletonManager();

/**
 * A replacement for the title attribute, using tippy.js.
 *
 * Usage:
 *
 *     import {title} from "components/ui/title";
 *     // ...
 *     const _DIRECTIVES_ = null && title; // Avoid import auto-removal and support tree-shaking.
 *     // ...
 *     <element use:title="The title text" />
 *
 * Note that there are some limitations in this approach:
 * - Directives cannot be applied to components, only to native element. If a component needs a title,
 *   either handle the title prop in the component explicitly (see Button), or wrap the component
 *   in a div/span with use:title.
 * - Tippy does not support attaching to disabled elements, e.g. disabled buttons or inputs.
 *   (Note however that Button already takes care of the disabled state.)
 *   The easiest workaround is to wrap the (potentially) disabled element in a div or span and put
 *   the title on that element.
 */
export function title(element: Element, accessor: Accessor<TitleDirectiveType>) {
  let thisTippy: Instance | undefined;
  createEffect(
    on(accessor, (value) => {
      const [titleValue, tippyProps] = isArrayForm(value) ? value : [value];
      if (titleValue != undefined && titleValue !== "") {
        element.setAttribute(
          "aria-label",
          typeof titleValue === "string"
            ? titleValue
            : titleValue instanceof HTMLElement
              ? titleValue.textContent || ""
              : "",
        );
        const content = (<div class="whitespace-pre-wrap">{titleValue}</div>) as HTMLElement;
        if (thisTippy) {
          // Also update the singleton tippy if this tippy is currently active. This is a workaround,
          // it should happen automatically, but there seems to be a bug preventing this if the tippy
          // has a trigger target specified.
          const isThisTippyActive = tippySingletonManager.getTippySingleton().props.content === thisTippy.props.content;
          thisTippy.setContent(content);
          if (isThisTippyActive) {
            tippySingletonManager.getTippySingleton().setContent(content);
          }
        } else {
          thisTippy = tippy(element, {
            content,
            ...tippyProps,
          });
          tippySingletonManager.add(thisTippy);
        }
      } else {
        if (thisTippy) {
          tippySingletonManager.delete(thisTippy);
          thisTippy = undefined;
        }
      }
    }),
  );
  onCleanup(() => {
    if (thisTippy) {
      tippySingletonManager.delete(thisTippy);
    }
  });
}

function isArrayForm(value: TitleDirectiveType): value is readonly [JSX.Element, Partial<TippyProps>] {
  return Array.isArray(value) && value.length === 2 && typeof value[1] === "object";
}

export function mergeTitleDirectiveProps(
  value: TitleDirectiveType,
  extraProps: Partial<TippyProps>,
): TitleDirectiveType {
  return isArrayForm(value) ? [value[0], {...value[1], ...extraProps}] : [value, extraProps];
}
