import {Title} from "@solidjs/meta";
import {VoidComponent} from "solid-js";
import {z} from "zod";
import {FelteForm} from "../components/felte-form/FelteForm";
import {CheckboxField} from "../components/ui/form/CheckboxField";
import {DictionarySelect} from "../components/ui/form/DictionarySelect";
import {Select} from "../components/ui/form/Select";
import {SimpleSelect} from "../components/ui/form/SimpleSelect";
import {TextField} from "../components/ui/form/TextField";

export default (() => {
  // During development, this place can be used to create a fake page and test components.
  // It is available at /dev/test-page, also via the "Test page" link in the menu (DEV mode only).
  // Do not submit the changes to this file.

  return (
    <>
      <Title>/dev/test-page</Title>
      <div class="flex flex-col gap-1">
        <FelteForm id="test" style={{width: "600px"}} schema={z.object({})}>
          <TextField name="email1" type="email" autocomplete="username" autofocus />
          <CheckboxField name="email2" />
          <SimpleSelect
            name="email3"
            options={[
              {value: "a", text: "aaa"},
              {value: "b", text: "bbb"},
              {value: "c", text: "ccc"},
            ]}
          />
          <Select
            name="email4"
            items={[
              {value: "a", label: () => "aaa"},
              {value: "b", label: () => "bbb"},
              {value: "c", label: () => "ccc"},
            ]}
            nullable
          />
          <DictionarySelect name="email5" dictionary="gender" nullable />
        </FelteForm>
      </div>
    </>
  );
}) satisfies VoidComponent;
