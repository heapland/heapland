import { Button, Menu, message, Dropdown, Space, Table, Tree, Layout, Select, Tabs, Alert, Skeleton, Modal } from "antd";
import React, { FC, ReactNode, useEffect, useState } from "react";
import { FaDatabase, FaTable } from "react-icons/fa";
import { BiPlay, BiCaretDown } from "react-icons/bi";
import { AiOutlineTable } from "react-icons/ai";
import { MdCode, MdMoreHoriz, MdPlayArrow, MdTableRows } from "react-icons/md";
import Editor from "@monaco-editor/react";
import "./DatabaseBrowser.scss";
import { MailOutlined } from "@ant-design/icons";
import CustomScroll from "react-custom-scroll";
import Connections from "../../../services/Connections";
import { ConnectionIcon } from "../../../components/Cards/DatasourceCard";
import Sider from "antd/lib/layout/Sider";
import { Content, Header } from "antd/lib/layout/layout";
import TablePane from "./TablePane";
import ServiceConnectionBuilder from "../Connections/ServiceConnectionBuilder";
import { DBQuery } from "../../../models/DatabaseBrowser";
import QueryPane from "./QueryPane";
import { UserContext } from "../../../store/User";
import { history } from "../../../configureStore";
const { Option } = Select;
const { Column } = Table;
const { SubMenu } = Menu;
const { DirectoryTree } = Tree;
const { TabPane } = Tabs;

type ObjType = "query" | "table";
interface DBPane {
  name: string;
  id: number;
  objectType: ObjType;
}
const DBBrowserHeader: FC<{
  connectionId: number;
  name: string;
  productName: string;
  version: string;
  schemas: string[];
  onEdit: () => void;
  onNewQuery: () => void;
  deleteWarning: (name: string) => void;
}> = ({ name, productName, version, onEdit, onNewQuery, deleteWarning }) => {
  const editDatabase = () => {};
  const databaseMenu = (
    <Menu>
      <Menu.Item key='0' onClick={(e) => onEdit()}>
        Edit Database
      </Menu.Item>
      <Menu.Item key='1' onClick={(e) => deleteWarning(name)}>
        Delete connection
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key='3' onClick={(e) => onNewQuery()}>
        Add Query
      </Menu.Item>
    </Menu>
  );

  return (
    <div className='db-browser-header'>
      <div className='left-container'>
        <Space align='center' size={8}>
          <i className='db-icon'>
            <ConnectionIcon name={productName} />
          </i>
          <div>
            <div className='db-conn-name'>{name}</div>
          </div>
        </Space>
      </div>
      <Dropdown overlay={databaseMenu} trigger={["click"]}>
        <Button icon={<MdMoreHoriz />}></Button>
      </Dropdown>
    </div>
  );
};

const DatabaseBrowser: FC<{ orgSlugId: string; workspaceId: number; databaseId: number }> = ({ orgSlugId, workspaceId, databaseId }) => {
  const context = React.useContext(UserContext);
  const [dbState, setDBState] = useState<{
    loading: boolean;
    connectionName: string;
    productName: string;
    version: string;
    schemas: string[];
    catalogs: string[];
    editMode: boolean;
    hasError: boolean;
    errorMsg?: string;
    selectedSchema?: string;
  }>({
    loading: true,
    connectionName: "",
    productName: "",
    version: "",
    editMode: false,
    hasError: false,
    schemas: [],
    catalogs: [],
  });

  const [dbQueries, setDBQueries] = useState<{ loading: boolean; queries: DBQuery[] }>({
    loading: true,
    queries: [],
  });

  const [dbTables, setDBTables] = useState<{ loading: boolean; tables: string[]; selectedTable?: string }>({
    tables: [],
    loading: true,
  });

  const enableEditMode = () => {
    setDBState({ ...dbState, editMode: true });
  };

  const hideEditMode = () => {
    fetchDBState();
  };

  const onNewQuery = () => {
    const existingNames = dbQueries.queries.map((q) => q.name);
    let newQueryName = "Untitled";
    const untitledQueries = existingNames.filter((q) => q.startsWith(newQueryName));

    if (untitledQueries.length > 0) {
      let max = 0;
      untitledQueries.forEach((q) => {
        if (q.length > newQueryName.length) {
          max = Number(q.substring(8));
        }
        max = max + 1;
      });
      if (max > 0) {
        newQueryName = `${newQueryName}${max}`;
      }
    }
    Connections.addQuery(databaseId, newQueryName, "", (qId) => {
      const newDBQueries = [...dbQueries.queries, { id: qId, name: newQueryName, text: "" }];
      setDBQueries({ ...dbQueries, queries: newDBQueries, loading: false });
    });
  };

  useEffect(() => {
    Connections.listQueries(databaseId, (queries) => {
      setDBQueries({ ...dbQueries, loading: false, queries: queries });
    });
  }, [databaseId]);

  const fetchDBState = () => {
    Connections.getDBSummary(
      databaseId,
      (s) => {
        Connections.listSchemas(databaseId, (schemas) => {
          if (s.productName.toLowerCase() === "postgresql") {
            setDBState({
              ...dbState,
              loading: false,
              connectionName: s.connectionName,
              productName: s.productName,
              version: `${s.majorVersion}.${s.minorVersion}`,
              schemas: schemas,
              hasError: false,
              editMode: false,
              selectedSchema: "public",
            });
          } else if (s.productName.toLowerCase() == "cassandra") {
            setDBState({
              ...dbState,
              loading: false,
              connectionName: s.connectionName,
              productName: s.productName,
              version: `${s.majorVersion}.${s.minorVersion}`,
              schemas: schemas,
              hasError: false,
              editMode: false,
              selectedSchema: schemas[0],
            });
          } else {
            setDBState({
              ...dbState,
              loading: false,
              productName: s.productName,
              connectionName: s.connectionName,
              hasError: false,
              editMode: false,
              version: `${s.majorVersion}.${s.minorVersion}`,
              schemas: schemas,
              selectedSchema: "na",
            });
          }
        });
      },
      (err) => {
        //message.error(`Unable to connect: ${err}`);
        setDBState({
          ...dbState,
          connectionName: err.connectionName,
          productName: err.provider,
          loading: false,
          hasError: true,
          editMode: false,
          errorMsg: err.error,
        });
      }
    );
  };

  useEffect(() => {
    setDBState({ ...dbState, loading: true });
    setDBTables({ ...dbTables, tables: [], loading: true });
    setDBQueries({ ...dbQueries, queries: [], loading: true });
    setDBTabs({ ...dbTabs, panes: [], selectedPane: undefined, activeKey: undefined });
    fetchDBState();
  }, [databaseId]);

  const [dbTabs, setDBTabs] = useState<{ selectedPane?: DBPane; activeKey?: string; panes: DBPane[] }>({
    panes: [],
  });

  const onTabChange = (key: string) => {
    let selectedTabObj = "query";
    if (key.startsWith("t")) {
      selectedTabObj = "table";
    }
    const objId = Number(key.substring(2));
    let activePane = dbTabs.panes.find((p) => p.id === objId && p.objectType === selectedTabObj);
    setDBTabs({ ...dbTabs, activeKey: key, selectedPane: activePane });
  };

  const onTabEdit = (targetKey: any, action: "add" | "remove") => {
    if (action === "remove") {
      const paneId = Number(targetKey.substring(2));
      let selectedTabObj = "query";
      if (targetKey.startsWith("t")) {
        selectedTabObj = "table";
      }
      const filteredPanes = dbTabs.panes.filter((p) => !(p.id === paneId && p.objectType === selectedTabObj));
      if (filteredPanes.length > 0) {
        if (dbTabs.activeKey === targetKey) {
          const removeIndex = dbTabs.panes.findIndex((p) => p.id === paneId);
          let newActiveIndex = removeIndex;
          if (removeIndex === dbTabs.panes.length - 1) {
            newActiveIndex = removeIndex - 1;
          }
          setDBTabs({
            ...dbTabs,
            activeKey: `${filteredPanes[newActiveIndex].objectType.valueOf().substring(0, 1)}-${filteredPanes[newActiveIndex].id}`,
            panes: filteredPanes,
            selectedPane: filteredPanes[newActiveIndex],
          });
        } else {
          setDBTabs({
            ...dbTabs,
            panes: filteredPanes,
          });
        }
      } else {
        setDBTabs({ ...dbTabs, activeKey: undefined, selectedPane: undefined, panes: [] });
      }
    }
  };

  const updateQuery = (id: number, queryName: string) => {
    const filteredPanes = [...dbTabs.panes];
    const indx = filteredPanes.findIndex((p) => p.id === id && p.objectType === "query");
    const newQueryPane: DBPane = { id: id, name: queryName, objectType: "query" };
    filteredPanes[indx] = newQueryPane;
    setDBTabs({ ...dbTabs, selectedPane: newQueryPane, panes: filteredPanes, activeKey: `q-${id}` });
    const filteredQueries = [...dbQueries.queries];
    const qIndx = filteredQueries.findIndex((p) => p.id === id);
    filteredQueries[qIndx] = { id: id, name: queryName, text: "" };
    setDBQueries({ ...dbQueries, queries: filteredQueries });
  };

  const addToPane = (id: number, name: string, objType: ObjType) => {
    const newKey = `${objType.valueOf().substring(0, 1)}-${id}`;
    let newPanes = [...dbTabs.panes];
    if (newPanes.filter((p) => p.id === id && p.objectType === objType).length === 0) {
      newPanes = [...dbTabs.panes, { id: id, name: name, objectType: objType }];
    }
    setDBTabs({ ...dbTabs, selectedPane: { name: name, id: id, objectType: objType }, panes: newPanes, activeKey: newKey });
  };

  useEffect(() => {
    if (dbState.selectedSchema) {
      Connections.listTables(databaseId, dbState.selectedSchema, (tables) => {
        setDBTables({ ...dbTables, tables: tables, loading: false });
      });
    }
  }, [dbState.selectedSchema, databaseId]);

  const handleDeleteConnection = () => {
    Connections.deleteConnection(databaseId, (r) => {
      message.success("Database Connection was deleted");
      Connections.listConnections((c) => {
        context.updateConnections(c);
      });
      history.push(`/${orgSlugId}/workspace/${workspaceId}/connections`);
    });
  };

  const deleteWarning = (name: string) => {
    Modal.warning({
      title: (
        <span>
          Delete <b>{name}</b>
        </span>
      ),
      content: `Are you sure you want to delete the connection?`,
      onOk: handleDeleteConnection,
      okCancel: true,
      okText: "Yes",
      cancelText: "No",
    });
  };

  return (
    <Layout className='database-browser-wrapper ant-layout-has-sider'>
      {!dbState.hasError && (
        <Sider
          theme='light'
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 200,
            top: 0,
            bottom: 0,
          }}
          width={250}
          className='workspace-side-nav'>
          <Skeleton title={true} active avatar paragraph={false} loading={dbState.loading}>
            <DBBrowserHeader
              connectionId={databaseId}
              name={dbState.connectionName}
              productName={dbState.productName}
              schemas={dbState.schemas}
              version={dbState.version}
              onEdit={enableEditMode}
              onNewQuery={onNewQuery}
              deleteWarning={deleteWarning}
            />
          </Skeleton>

          {dbState.schemas.length > 0 && (
            <div className='db-side-nav-segment'>
              <div className='nav-item-title'>{dbState.productName.toLowerCase() === "cassandra" ? "KEYSPACES" : "SCHEMAS"}</div>
              <Select
                value={dbState.selectedSchema}
                size='small'
                style={{ width: 200 }}
                onSelect={(v: any) => {
                  setDBState({ ...dbState, selectedSchema: v.toString() });
                }}>
                {dbState.schemas.map((v, i) => (
                  <Option className='schema-option' value={v} key={i}>
                    {v}
                  </Option>
                ))}
              </Select>
            </div>
          )}

          <CustomScroll heightRelativeToParent='calc(50vh - 55px)'>
            <Menu theme='light' mode='inline' defaultSelectedKeys={[]} defaultOpenKeys={["tables"]}>
              <SubMenu
                key='tables'
                icon={
                  <i className={`side-nav-icon`}>
                    <FaTable />
                  </i>
                }
                title='Tables'>
                <Skeleton
                  paragraph={{ rows: 4, width: [200, 200, 200, 200] }}
                  title={false}
                  active={true}
                  loading={dbTables.loading}></Skeleton>
                {dbTables.tables.map((table, i) => (
                  <Menu.Item
                    key={i}
                    onClick={(e) => {
                      addToPane(i, table, "table");
                    }}>
                    {table}
                  </Menu.Item>
                ))}
              </SubMenu>
            </Menu>
          </CustomScroll>
          <CustomScroll heightRelativeToParent='calc(50vh - 55px)'>
            <Menu theme='light' mode='inline' defaultSelectedKeys={[]} defaultOpenKeys={["queries"]}>
              {dbQueries.queries.length > 0 && (
                <SubMenu
                  key='queries'
                  icon={
                    <i className={`side-nav-icon`}>
                      <MdCode />
                    </i>
                  }
                  title='Queries'>
                  {dbQueries.queries.map((query, i) => (
                    <Menu.Item
                      key={i}
                      onClick={(e) => {
                        addToPane(query.id, query.name, "query");
                      }}>
                      {query.name}
                    </Menu.Item>
                  ))}
                </SubMenu>
              )}
            </Menu>
          </CustomScroll>
        </Sider>
      )}

      <Content style={{ marginLeft: 250 }}>
        {dbState.hasError && (
          <div className='error-box'>
            <Alert type='error' message={dbState.errorMsg} />
            <Space>
              <Button type='primary' onClick={(e) => enableEditMode()}>
                Edit Connection
              </Button>
              <Button type='default' onClick={(e) => deleteWarning(dbState.connectionName)}>
                Delete Connection
              </Button>
            </Space>
          </div>
        )}
        <div className='height-100 db-info-container'>
          {!dbState.hasError && (
            <Tabs hideAdd onChange={onTabChange} activeKey={dbTabs.activeKey} type='editable-card' className='db-tabs' onEdit={onTabEdit}>
              {dbTabs.panes.map((pane) => (
                <>
                  {pane.objectType === "table" && (
                    <TabPane
                      tab={
                        <div className='db-tab-header' aria-details={pane.name} onAuxClick={(e) => {}}>
                          <FaTable />
                          <div>{pane.name}</div>
                        </div>
                      }
                      key={`t-${pane.id}`}>
                      <TablePane connectionId={databaseId} schema={dbState.selectedSchema} name={pane.name} />
                    </TabPane>
                  )}
                  {pane.objectType === "query" && (
                    <TabPane
                      tab={
                        <div className='db-tab-header' aria-details={pane.name} onAuxClick={(e) => {}}>
                          <MdCode />
                          <div>{pane.name}</div>
                        </div>
                      }
                      key={`q-${pane.id}`}>
                      <QueryPane connectionId={databaseId} queryId={pane.id} name={pane.name} onUpdateQueryName={updateQuery} />
                    </TabPane>
                  )}
                </>
              ))}
            </Tabs>
          )}
        </div>
      </Content>
      <ServiceConnectionBuilder
        orgSlugId={orgSlugId}
        workspaceId={workspaceId}
        service={dbState.productName}
        isOpen={dbState.editMode}
        connectionId={databaseId}
        editMode={true}
        onClose={hideEditMode}
        available={true}
        initialValues={{ name: dbState.connectionName }}
      />
    </Layout>
  );
};

export default DatabaseBrowser;
