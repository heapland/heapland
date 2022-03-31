import { MemberProfile } from "../services/AuthService";
import { ConnectionView } from "../services/Connections";

export const UPDATE_LOGIN = "UPDATE_LOGIN";
export const DELETE_USER_SESSION = "DELETE_USER_SESSION";

interface UpdateLoginAction {
  type: typeof UPDATE_LOGIN;
  memberId: number;
  email: string;
  name: string;
  profile?: MemberProfile;
  activeConnections: ConnectionView[];
}

interface DeleteLoginAction {
  type: typeof DELETE_USER_SESSION;
}

export type AuthActionTypes = UpdateLoginAction | DeleteLoginAction;

export const updateLogin = (id: number, email: string, name: string, profile?: MemberProfile): AuthActionTypes => {
  return {
    type: UPDATE_LOGIN,
    memberId: id,
    email: email,
    name: name,
    profile: profile,
    activeConnections: [],
  };
};

export const deleteSession = (): AuthActionTypes => ({
  type: DELETE_USER_SESSION,
});
