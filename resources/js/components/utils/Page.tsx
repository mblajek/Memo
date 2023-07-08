import { Meta, Title } from "@solidjs/meta";
import { ParentComponent, Show } from "solid-js";

export type PageProps = {
  /**
   * HTML's `<title>` value
   */
  title?: string;
  /**
   * HTML's `<meta name="description">` content
   */
  description?: string;
};

/**
 * Represents applications view, e.g. Login page
 *
 * Sets HTML's head data dynamically
 *
 * @todo handle permissions with `AccessBarrier`
 */
export const Page: ParentComponent<PageProps> = (props) => {
  return (
    <>
      <Show when={props.title}>
        <Title>{props.title} | Memo</Title>
      </Show>
      <Show when={props.description}>
        <Meta name="description" content={props.description} />
      </Show>
      {/* TODO: AccessBarrier */}
      {props.children}
    </>
  );
};
