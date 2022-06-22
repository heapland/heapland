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
            document.documentElement.setAttribute("data-theme", "dark");
          } else {
            document.documentElement.setAttribute("data-theme", "light");
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

          <Switch size='small' checked={state.isDark} defaultChecked={state.isDark} onChange={onChangeTheme} />

          <GitHubButton href='https://github.com/heapland/heapland' data-color-scheme={state.isDark ? 'dark': "light"} data-show-count='true' aria-label='Star heapland/heapland on GitHub'>
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
        </Content>
      </Layout>
    </Layout>
  );
};
export default connect(mapStateToProps, mapDispatchToProps)(WorkspaceMain);
