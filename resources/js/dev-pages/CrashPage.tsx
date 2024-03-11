import {VoidComponent, createSignal} from "solid-js";
import {MemoTitle} from "../features/root/MemoTitle";

export default (() => {
  const [getCountdownMillis, setCountdownMillis] = createSignal(3000);
  const interval = setInterval(() => {
    const c = getCountdownMillis();
    setCountdownMillis(c - 100);
    if (c <= 0) {
      clearInterval(interval);
    }
  }, 100);
  const countdown = () => {
    const c = getCountdownMillis();
    if (c <= 0) {
      throw new Error("Crash");
    }
    return `${(c / 1000).toFixed(1)}s`;
  };
  return (
    <>
      <MemoTitle title="Crash" />
      <div class="w-fit bg-red-100 m-2 p-4 rounded-md">Crashing the page in {countdown()}...</div>
    </>
  );
}) satisfies VoidComponent;
