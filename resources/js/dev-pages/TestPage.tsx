import {Button} from "components/ui/Button";
import {Recreator} from "components/utils/Recreator";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {createSignal, VoidComponent} from "solid-js";

export const TestComponent: VoidComponent = () => {
  console.info("%cTestComponent create", "background: white; color: green; padding: 5px; border-radius: 5px;");
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
  const [recreatorSignal, setRecreatorSignal] = createSignal(1);
  return (
    <>
      <AppTitlePrefix prefix="TestPage" />
      <div class="w-full flex flex-col items-stretch gap-1">
        <div class="bg-purple-100 m-2 p-4 rounded-md flex items-center justify-between">
          <div>Test your components here during development by creating a test page in TestPage.tsx.</div>
          <Button class="secondary small !bg-white" onClick={[setRecreatorSignal, recreatorSignal() + 1]}>
            Reload
          </Button>
        </div>
        <div class="p-2 flex flex-col items-start gap-1">
          <Recreator signal={recreatorSignal()}>
            <TestComponent />
          </Recreator>
        </div>
      </div>
    </>
  );
}) satisfies VoidComponent;
