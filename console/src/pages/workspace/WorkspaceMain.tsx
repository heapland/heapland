import * as React from "react";
import { Link } from "react-router-dom";
import GitHubButton from "react-github-btn";
import { Layout, Menu, Dropdown, Button, Space, Tooltip, Tag, Switch } from "antd";
import { connect } from "react-redux";
import { appLoaded } from "../../actions/app";
import { User, UserContext } from "../../store/User";
import { AppState } from "../../reducers";
import { updateLogin } from "../../actions/auth";
import { Dispatch } from "redux";
import { MdDashboard } from "react-icons/md";
import { FaDatabase, FaStream, FaFileInvoice } from "react-icons/fa";
import { BsPlusLg } from "react-icons/bs";
import { Hexagon } from "../../components/Icons/NavIcons";
import AuthService, { MemberProfile } from "../../services/AuthService";
import { history } from "../../configureStore";
import packageJson from "../../../package.json";
import CustomScroll from "react-custom-scroll";
import BrandLogo from "../../static/img/heapland.png";
import { getLocalStorage } from "../../services/Utils";
import WebService from "../../services/WebService";
import { ConsoleLogo } from "../../components/Icons/ConsoleLogo";
import "../../style/customScroll.css";
import Connections, { ConnectionView } from "../../services/Connections";
import Workspace from "../../services/Workspace";

const { Content, Sider } = Layout;
const { SubMenu } = Menu;

interface IMainProps {
  index: string;
  content: React.ReactNode;
  isAppLoaded: boolean;
  subIndex?: string;
  slugId?: string;
  updateLogin?: typeof updateLogin;
  appLoaded?: typeof appLoaded;
  user?: User;
}

const mapStateToProps = (state: AppState) => ({
  isAppLoaded: state.app.isAppLoaded,
  user: state.auth,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  updateLogin: (id: number, email: string, name: string, profile?: MemberProfile) => dispatch(updateLogin(id, email, name, profile)),
  appLoaded: () => dispatch(appLoaded()),
});
const getInitials = (text: string): string => {
  if (text.split(" ").length > 1) {
    let splits = text.split(" ");
    return splits[0].charAt(0).toUpperCase() + splits[1].charAt(0).toUpperCase();
  } else {
    return text.charAt(0).toUpperCase();
  }
};

const OrgThumbnailImg: React.FC<{ name: string; thumbnail?: string }> = ({ name, thumbnail }) => {
  const web = new WebService();
  return (
    <>
      {!thumbnail && <span className='org-initials'>{getInitials(name)}</span>}
      {thumbnail && <img src={`${web.getEndpoint()}${thumbnail}`} alt={`${name} thumbnail`} />}
    </>
  );
};

const WorkspaceMain: React.FC<IMainProps> = ({ index, content, subIndex, updateLogin, isAppLoaded, appLoaded, user }) => {
  const context = React.useContext(UserContext);

  const [state, setState] = React.useState<{ collapsed: boolean; activeConnections: ConnectionView[]; loading: boolean; isDark: boolean }>({
    collapsed: getLocalStorage("collaps") || false,
    activeConnections: [],
    loading: true,
    isDark: false,
  });

  const handleLogout = () => {
    AuthService.logOut().then((r) => {
      if (r.success) {
        console.log("moving to login page");
        context.updateUser(0, "", "", false, undefined);
        history.push("/login");
      }
    });
  };

  const trimText = (t: string) => {
    if (t.length > 10) {
      return `${t.substr(0, 10)}..`;
    } else {
      return t;
    }
  };

  let onCollaps = {};
  if (state.collapsed) {
    onCollaps = {
      display: "none",
    };
  }

  const orgMenu = (
    <Menu mode='horizontal'>
      <Menu.Item key='1' onClick={(e) => history.push(`/${context.currentUser.profile?.orgSlugId}/settings`)}>
        <span>Settings</span>
      </Menu.Item>

      <Menu.Item key='2' onClick={() => handleLogout()}>
        <span>Logout</span>
      </Menu.Item>
    </Menu>
  );

  const onChangeTheme = (checked: boolean) => {
    Workspace.updateTheme(
      {
        webTheme: checked ? "dark" : "light",
        desktopTheme: context.currentUser.profile.desktopTheme,
      },
      (res) => {
        if (res.themeUpdated) {
          setState({ ...state, isDark: checked });
          if (checked) {
            context.updateUser(context.currentUser.id, context.currentUser.name, context.currentUser.email, context.currentUser.loggedIn, {
              ...context.currentUser.profile,
              webTheme: "dark",
            });
            document.documentElement.setAttribute("data-theme", "dark");
          } else {
            document.documentElement.setAttribute("data-theme", "light");
            context.updateUser(context.currentUser.id, context.currentUser.name, context.currentUser.email, context.currentUser.loggedIn, {
              ...context.currentUser.profile,
              webTheme: "light",
            });
          }
        }
      }
    );
  };

  React.useEffect(() => {
    if (context.currentUser.profile.webTheme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      setState({ ...state, isDark: false });
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      setState({ ...state, isDark: true });
    }
  }, []);

  return (
    <Layout className='main-app-wrapper'>
      <Sider trigger={null} collapsed={false} className='workspace-side-nav hex-sider-light'>
        <div className='workspace-header'>
          <div className={`logo`}>
            <Hexagon size={state.collapsed ? 23 : 20} />
            {user && (
              <span className='brand-name'>{context.currentUser.profile && `${trimText(context.currentUser.profile.workspaceName)}`}</span>
            )}
          </div>

          <Dropdown overlay={orgMenu} trigger={["click"]} overlayStyle={{ width: 200 }}>
            <div className={`logo`}>
              {context.currentUser.profile && (
                <OrgThumbnailImg name={context.currentUser.profile.orgName} thumbnail={context.currentUser.profile.orgThumbnail} />
              )}
            </div>
          </Dropdown>
        </div>
        <CustomScroll heightRelativeToParent='calc(100vh - 100px)'>
          <Menu theme='light' mode='inline' defaultSelectedKeys={[subIndex]} defaultOpenKeys={[index]}>
            <Menu.Item
              key='0'
              className='center-name'
              onClick={(e) =>
                history.push(
                  `/${context.currentUser.profile?.orgSlugId}/workspace/${context.currentUser.profile?.workspaceId}/add-connection`
                )
              }>
              <Button
                type='primary'
                icon={
                  <i style={{ fontSize: 12, marginTop: 4, marginRight: 5, color: "#fff" }}>
                    <BsPlusLg />
                  </i>
                }>
                Add Connection
              </Button>
            </Menu.Item>

            {context.connections.length > 0 && context.connections.filter((ac) => ac.providerCategory === "rdbms").length > 0 && (
              <SubMenu
                key='rdbms'
                icon={
                  <i className={`side-nav-icon`}>
                    <FaDatabase />
                  </i>
                }
                title='Databases'>
                {context.connections
                  .filter((ac) => ac.providerCategory === "rdbms")
                  .map((cp) => (
                    <Menu.Item
                      key={cp.id}
                      onClick={(e) =>
                        history.push(
                          `/${context.currentUser.profile?.orgSlugId}/workspace/${context.currentUser.profile?.workspaceId}/rdbms/${cp.id}`
                        )
                      }>
                      {cp.name}
                    </Menu.Item>
                  ))}
              </SubMenu>
            )}
            {context.connections.length > 0 && context.connections.filter((ac) => ac.providerCategory === "fs").length > 0 && (
              <SubMenu
                key='fs'
                icon={
                  <i className={`side-nav-icon`}>
                    <FaFileInvoice />
                  </i>
                }
                title='File Systems'>
                {context.connections
                  .filter((ac) => ac.providerCategory === "fs")
                  .map((cp) => (
                    <Menu.Item
                      onClick={(e) =>
                        history.push(
                          `/${context.currentUser.profile?.orgSlugId}/workspace/${context.currentUser.profile?.workspaceId}/fs/${cp.id}`
                        )
                      }
                      key={cp.id}>
                      {cp.name}
                    </Menu.Item>
                  ))}
              </SubMenu>
            )}
            {context.connections.length > 0 && context.connections.filter((ac) => ac.providerCategory === "messaging").length > 0 && (
              <SubMenu
                icon={
                  <i className={`side-nav-icon`}>
                    <FaFileInvoice />
                  </i>
                }
                title='Messaging Systems'>
                {context.connections
                  .filter((ac) => ac.providerCategory === "messaging")
                  .map((cp) => (
                    <Menu.Item
                      onClick={(e) =>
                        history.push(
                          `/${context.currentUser.profile?.orgSlugId}/workspace/${
                            context.currentUser.profile?.workspaceId
                          }/${cp.provider.toLowerCase()}/${cp.id}`
                        )
                      }
                      key={cp.id}>
                      {cp.name}
                    </Menu.Item>
                  ))}
              </SubMenu>
            )}
          </Menu>
        </CustomScroll>

        <div className='brand-footer'>
          <div className='brand-logo-container'>
            <img src={BrandLogo} />
          </div>

          <GitHubButton
            href='https://github.com/heapland/heapland'
            data-color-scheme={state.isDark ? "dark" : "light"}
            data-show-count='true'
            aria-label='Star heapland/heapland on GitHub'>
            Star
          </GitHubButton>
        </div>
      </Sider>
      <Layout className='site-layout'>
        <Content
          className='site-layout-background'
          style={{
            padding: "0px",
            minHeight: 280,
          }}>
          {content}
          <Tooltip title={state.isDark ? "Light Mode" : "Dark Mode"}>
            <div className='theme-change-btn' onClick={() => onChangeTheme(!state.isDark)}>
              {state.isDark ? (
                <svg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' version='1.1' viewBox='0 0 752 752'>
                  <g fill='#fff'>
                    <path d='m464.8 376c0 49.043-39.754 88.797-88.797 88.797-49.039 0-88.797-39.754-88.797-88.797 0-49.039 39.758-88.797 88.797-88.797 49.043 0 88.797 39.758 88.797 88.797z' />
                    <path
                      d='m376 302c-40.867 0-73.996 33.129-73.996 73.996 0 40.871 33.129 74 73.996 74 40.871 0 74-33.129 74-74 0-40.867-33.129-73.996-74-73.996zm-103.59 73.996c0-57.215 46.379-103.59 103.59-103.59s103.6 46.379 103.6 103.59-46.383 103.6-103.6 103.6-103.59-46.383-103.59-103.6z'
                      fillRule='evenodd'
                    />
                    <path
                      d='m376 173.74c8.1758 0 14.801 6.625 14.801 14.801v49.332c0 8.1719-6.625 14.797-14.801 14.797-8.1719 0-14.797-6.625-14.797-14.797v-49.332c0-8.1758 6.625-14.801 14.797-14.801zm0 325.59c8.1758 0 14.801 6.6289 14.801 14.801v49.332c0 8.1719-6.625 14.801-14.801 14.801-8.1719 0-14.797-6.6289-14.797-14.801v-49.332c0-8.1719 6.625-14.801 14.797-14.801z'
                      fillRule='evenodd'
                    />
                    <path
                      d='m232.98 232.98c5.7773-5.7812 15.148-5.7812 20.926 0l34.883 34.883c5.7812 5.7773 5.7812 15.148 0 20.93-5.7773 5.7773-15.148 5.7773-20.93 0l-34.879-34.883c-5.7812-5.7812-5.7812-15.152 0-20.93zm230.22 230.22c5.7812-5.7773 15.152-5.7773 20.93 0l34.883 34.883c5.7773 5.7812 5.7773 15.152 0 20.93-5.7812 5.7773-15.148 5.7773-20.93 0l-34.883-34.883c-5.7773-5.7773-5.7773-15.148 0-20.93z'
                      fillRule='evenodd'
                    />
                    <path
                      d='m519.02 232.98c5.7812 5.7773 5.7812 15.148 0 20.93l-34.883 34.883c-5.7773 5.7773-15.148 5.7773-20.93 0-5.7773-5.7812-5.7773-15.152 0-20.93l34.883-34.883c5.7812-5.7812 15.152-5.7812 20.93 0zm-230.22 230.22c5.7773 5.7812 5.7773 15.152 0 20.93l-34.883 34.883c-5.7812 5.7773-15.152 5.7773-20.93 0-5.7812-5.7773-5.7812-15.148 0-20.93l34.883-34.883c5.7773-5.7773 15.148-5.7773 20.93 0z'
                      fillRule='evenodd'
                    />
                    <path
                      d='m578.26 376c0 8.1758-6.6289 14.801-14.801 14.801h-49.332c-8.1719 0-14.801-6.625-14.801-14.801 0-8.1719 6.6289-14.797 14.801-14.797h49.332c8.1719 0 14.801 6.625 14.801 14.797zm-325.59 0c0 8.1758-6.625 14.801-14.797 14.801h-49.332c-8.1758 0-14.801-6.625-14.801-14.801 0-8.1719 6.625-14.797 14.801-14.797h49.332c8.1719 0 14.797 6.625 14.797 14.797z'
                      fillRule='evenodd'
                    />
                  </g>
                </svg>
              ) : (
                <svg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' version='1.1' viewBox='0 0 752 752'>
                  <path
                    d='m472.14 353.6c0-30.5 12.078-42.621 42.621-42.621-30.5 0-42.621-12.078-42.621-42.621 0 30.547-12.078 42.621-42.621 42.621 30.547 0.046875 42.621 12.121 42.621 42.621zm26.566 16.34c0 20.176-8.0039 28.414-28.414 28.414 20.176 0 28.414 8.0039 28.414 28.18 0-20.176 8.0039-28.18 28.414-28.18-20.406-0.23828-28.41-8.1484-28.41-28.414zm-105.75-79.754c0-14.445 5.7305-20.176 20.176-20.176-14.445 0-20.176-5.7305-20.176-20.176 0 14.445-5.7305 20.176-20.176 20.176 14.445 0.003906 20.176 5.7344 20.176 20.176zm56.164 208.66c-44.031-16.52-81.883-46.25-108.36-85.121-26.477-38.867-40.289-84.973-39.543-132 0.74609-47.023 16.016-92.668 43.715-130.68-47.816 11.426-90.66 38.004-122.14 75.762-31.484 37.762-49.918 84.688-52.555 133.78-2.6406 49.09 10.656 97.723 37.91 138.64 27.25 40.918 66.996 71.934 113.31 88.422 46.316 16.488 96.723 17.566 143.7 3.0742 46.98-14.496 88.016-43.781 116.99-83.5-44.184 10.602-90.527 7.6797-133.03-8.3828z'
                    fill='#0a122c'
                  />
                </svg>
              )}
            </div>
          </Tooltip>
        </Content>
      </Layout>
    </Layout>
  );
};
export default connect(mapStateToProps, mapDispatchToProps)(WorkspaceMain);
