import { ParentComponent, Show } from "solid-js";
import { Meta, Title } from '@solidjs/meta'

export type PageProps = {
  title?: string;
  description?: string;
}

export const Page: ParentComponent<PageProps> = (props) => {
  return <>
    <Show when={props.title}>
      <Title>{props.title} | Memo</Title>
    </Show>
    <Show when={props.description}>
      <Meta name="description" content={props.description} />
    </Show>
    {/* TODO: AccessBarrier */}
    {props.children}
  </>
}