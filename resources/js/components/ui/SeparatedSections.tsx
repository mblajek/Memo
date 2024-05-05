import {
  Accessor,
  For,
  JSX,
  ParentComponent,
  ResolvedJSXElement,
  Signal,
  children,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from "solid-js";

interface Props {
  readonly innerClass?: string;
  readonly separator: (show: Accessor<boolean>) => JSX.Element;
}

/**
 * A list of sections, each of which can be present or missing, or have zero height (which is treated the same
 * as missing). The sections are separated by separators, which only appear when it is really needed
 * to separate two present sections.
 *
 * If a section is not an HTMLElement, it is treated as present, even if it is e.g. an empty string.
 */
export const SeparatedSections: ParentComponent<Props> = (props) => {
  const ch = children(() => props.children);
  const chArray = () => ch.toArray();
  const elementToIsPresentSignal = new Map<ResolvedJSXElement, Signal<boolean>>();
  const obs = new ResizeObserver((entries) => {
    for (const entry of entries) {
      elementToIsPresentSignal.get(entry.target)?.[1](entry.contentBoxSize.some((b) => b.blockSize));
    }
  });
  const sections = createMemo(
    on(chArray, (chArray, prevChArray) => {
      if (prevChArray) {
        for (const prevChild of prevChArray) {
          if (prevChild instanceof HTMLElement && !chArray.includes(prevChild)) {
            obs.unobserve(prevChild);
            elementToIsPresentSignal.delete(prevChild);
          }
        }
      }
      const sections = chArray.map((section, i) => {
        let isPresent: Accessor<boolean>;
        const isPresentSignal = elementToIsPresentSignal.get(section);
        if (isPresentSignal) {
          isPresent = isPresentSignal[0];
        } else if (section instanceof HTMLElement) {
          const [getIsPresent, setIsPresent] = createSignal(section.clientHeight > 0);
          isPresent = getIsPresent;
          elementToIsPresentSignal.set(section, [isPresent, setIsPresent]);
          obs.observe(section);
        } else {
          isPresent = () => section != undefined;
        }
        const needsSeparatorBefore = () => isPresent() && sections.slice(0, i).some(({isPresent}) => isPresent());
        return {section, isPresent, needsSeparatorBefore};
      });
      return sections;
    }),
  );
  onCleanup(() => obs.disconnect());
  return (
    <For each={sections()}>
      {({section, needsSeparatorBefore}) => (
        <>
          {props.separator(needsSeparatorBefore)}
          {section}
        </>
      )}
    </For>
  );
};
