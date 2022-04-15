import * as React from "react";
import { UserContext } from "../store/User";
import { history } from "../configureStore";

export const MainRedirect: React.FC = () => {
  const context = React.useContext(UserContext);

  React.useEffect(() => {
    if (context.currentUser.loggedIn && context.currentUser.profile) {
      history.push(`/${context.currentUser.profile.orgSlugId}/workspace/${context.currentUser.profile.workspaceId}/connections`);
    } else if (context.currentUser.loggedIn) {
      history.push(`/onboard`);
    } else {
      history.push(`/login`);
    }
  }, []);

  return <></>;
};
