import {Title} from "@solidjs/meta";
import {VoidComponent} from "solid-js";

export default (() => {
  // During development, this place can be used to create a fake page and test components.
  // It is available at /dev/test-page, also via the "Test page" link in the menu (DEV mode only).
  // Don't submit the changes to this file.

  return (
    <>
      <Title>/dev/test-page</Title>
      <div class="flex flex-col gap-1">
        <div class="w-fit bg-purple-100 m-2 p-4 rounded-md">
          Test your components here during development by creating a test page in TestPage.tsx.
        </div>
      </div>
    </>
  );
}) satisfies VoidComponent;
