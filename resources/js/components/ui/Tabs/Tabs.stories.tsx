import type { Meta, StoryObj } from "storybook-solidjs";

import { Tabs } from "./Tabs";

const meta = {
  component: Tabs,
  title: "UI/Tabs",
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  render: () => <Tabs />,
};
