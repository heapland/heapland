import * as React from "react";

export const config = {
  githubRequests: "https://github.com/heapland/requests/issues/new",
  slackInvite: "",
  twitterUsername: "HeaplandHQ",
  copyright: `Copyright © ${new Date().getFullYear()} Heapland.com`,
};

export interface ConfigType {
  key: string;
  name: string;
  description: string;
  eta: string;
  icon: React.ReactNode;
}
