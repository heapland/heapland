import { MemberProfile } from "../services/AuthService";
import React from "react";
import { ConnectionView } from "../services/Connections";

export interface User {
  id: number;
  email: string;
  name: string;
  loggedIn: boolean;
  profile?: MemberProfile;
}

interface AppContext {
  currentUser: User;
  loading: boolean;
  connections: ConnectionView[];
  updateUser: (id: number, name: string, email: string, loggedIn: boolean, profile?: MemberProfile) => void;
  updateConnections: (connections: ConnectionView[]) => void;
}

export const InitialUser: User = {
  id: 0,
  name: "",
  email: "",
  loggedIn: false,
};

const UserContext = React.createContext<AppContext>({
  currentUser: InitialUser,
  loading: true,
  connections: [],
  updateUser: () => {},
  updateConnections: () => {},
});

export { UserContext };
