import { Accessor, Setter, createEffect, createSignal } from "solid-js";

export function createLocalSignal<T>(
    name: string,
    init: T
): [Accessor<T>, Setter<T>] {
    const localState = localStorage.getItem(name);
    const [state, setState] = createSignal<T>(
        localState !== null ? JSON.parse(localState) : init
    );

    createEffect(() => localStorage.setItem(name, JSON.stringify(state())));

    return [state, setState];
}
