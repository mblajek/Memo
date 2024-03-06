import {VoidComponent} from "solid-js";
import {MemoTitle} from "../features/root/MemoTitle";

export const TestComponent: VoidComponent = () => {
  // TEST CODE HERE:

  return (
    <>
      {/* TEST CODE HERE:                                                                                              */}
    </>
  );
};

export default (() => {
  // During development, this place can be used to create a fake page and test components.
  // It is available at /dev/test-page, also via the "Test page" link in the menu (DEV mode only).
  // Don't submit the changes to this file.
  return (
    <>
      <MemoTitle title="TestPage" />
      <div class="flex flex-col gap-1">
        <div class="w-fit bg-purple-100 m-2 p-4 rounded-md">
          Test your components here during development by creating a test page in TestPage.tsx.
        </div>
        <div class="p-2 flex flex-col items-start gap-1">
          <TestComponent />
        </div>
      </div>
    </>
  );
}) satisfies VoidComponent;
