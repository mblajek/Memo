import {Accessor, createEffect, JSX, on, onCleanup} from "solid-js";
import tippy, {createSingleton, CreateSingletonInstance, Instance, Props as TippyProps} from "tippy.js";
import "tippy.js/animations/shift-toward-subtle.css";
import "tippy.js/dist/border.css";
import "tippy.js/dist/tippy.css";
import "./title.scss";

export type TitleDirectiveType = JSX.Element | readonly [JSX.Element, Partial<ExtraTippyProps>];

interface ExtraTippyProps extends Omit<TippyProps, "delay"> {
  /** The appear/disappear delay. Undefined means the default. */
  readonly delay?: number | readonly [number | null | undefined, number | null | undefined];
}

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      title: TitleDirectiveType;
    }
  }
}

export const DEFAULT_TITLE_DELAY: [number, number] = [300, 300];

/** The tippy props that can be overridden in the individual instances. */
const DEFAULT_TIPPY_PROPS = {
  placement: "top",
  delay: DEFAULT_TITLE_DELAY,
  hideOnClick: false,
  offset: [0, 8],
  maxWidth: "500px",
  ignoreAttributes: true,
  popperOptions: {
    modifiers: [{name: "eventListeners", options: {scroll: false}}],
  },
} satisfies Partial<TippyProps>;

/**
 * An object that manages the current app-wide singleton tippy.
 * There seem to be some bugs related to adding and removing individual tippys in the singleton tippy,
 * so the singleton tippy is recreated when the set of tippys change, buffering the changes on a timer
 * to improve performance.
 */
class TippySingletonManager {
  /**
   * The individual tippys for the elements that should show title. It might not yet be the current set of
   * instances in the singleton tippy. */
  private tippys: readonly Instance[] = [];
  /** The list of tippys that should be destroyed when the singleton tippy is recreated next time. */
  private tippysToDestroy: Instance[] = [];

  private tippySingleton: CreateSingletonInstance | undefined;

  private recreateTimer: ReturnType<typeof setTimeout> | undefined;

  add(newTippy: Instance) {
    this.tippys = [...this.tippys, newTippy];
    this.scheduleRecreate();
    return () => this.delete(newTippy);
  }

  delete(tippyToDelete: Instance) {
    this.tippysToDestroy.push(tippyToDelete);
    this.tippys = this.tippys.filter((t) => t !== tippyToDelete);
    if (this.tippySingleton?.state.isMounted) {
      this.tippySingleton.hide();
      this.scheduleRecreate(300);
    } else {
      this.scheduleRecreate();
    }
  }

  private scheduleRecreate(delayMillis = 100) {
    if (!this.recreateTimer) {
      this.recreateTimer = setTimeout(() => {
        this.recreateTimer = undefined;
        if (this.tippySingleton) {
          this.tippySingleton.destroy();
          for (const tippy of this.tippysToDestroy) {
            tippy.destroy();
          }
          this.tippysToDestroy = [];
          this.tippySingleton = undefined;
        }
        this.getTippySingleton();
      }, delayMillis);
    }
  }

  getTippySingleton() {
    if (!this.tippySingleton)
      this.tippySingleton = createSingleton([...this.tippys], {
        ...DEFAULT_TIPPY_PROPS,
        duration: 200,
        animation: "shift-toward-subtle",
        moveTransition: "transform 150ms ease",
        theme: "memo",
        touch: "hold",
        overrides: ["placement", "delay", "hideOnClick", "offset", "maxWidth"],
      });
    return this.tippySingleton;
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
 *     type _Directives = typeof title; // Avoid import auto-removal and support tree-shaking.
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
          "aria-description",
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
            ...DEFAULT_TIPPY_PROPS,
            ...tippyProps,
            delay: (tippyProps?.delay === undefined
              ? DEFAULT_TITLE_DELAY
              : Array.isArray(tippyProps?.delay)
                ? tippyProps.delay.map((d, i) => (d === undefined ? DEFAULT_TITLE_DELAY[i] : d))
                : tippyProps?.delay) as TippyProps["delay"],
            theme: "memo",
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

function isArrayForm(value: TitleDirectiveType): value is readonly [JSX.Element, Partial<ExtraTippyProps>] {
  return Array.isArray(value) && value.length === 2 && typeof value[1] === "object";
}

export function mergeTitleDirectiveProps(
  value: TitleDirectiveType,
  extraProps: Partial<TippyProps>,
): TitleDirectiveType {
  return isArrayForm(value) ? [value[0], {...value[1], ...extraProps}] : [value, extraProps];
}
