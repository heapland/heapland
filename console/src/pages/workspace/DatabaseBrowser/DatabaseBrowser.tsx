import { Button, Menu, message, Dropdown, Space, Table, Tree, Layout, Select, Tabs, Alert, Skeleton, Modal, List, Empty } from "antd";
import React, { FC, ReactNode, useEffect, useState, useRef } from "react";
import { FaDatabase, FaNetworkWired, FaTable } from "react-icons/fa";
import Editor, { Monaco, useMonaco, loader } from "@monaco-editor/react";

import { Resizable } from "re-resizable";
import {
  MdCode,
  MdFolder,
  MdMoreHoriz,
  MdOutlineFunctions,
  MdOutlineViewSidebar,
  MdPlayArrow,
  MdTableRows,
  MdViewColumn,
} from "react-icons/md";
import "./DatabaseBrowser.scss";
import { DownOutlined, MailOutlined } from "@ant-design/icons";
import CustomScroll from "react-custom-scroll";
import Connections, { ColumnDetails, SchemaObjects, TableMeta } from "../../../services/Connections";
import { ConnectionIcon } from "../../../components/Cards/DatasourceCard";
import Sider from "antd/lib/layout/Sider";
import { Content, Header } from "antd/lib/layout/layout";
import TablePane from "./TablePane";
import ServiceConnectionBuilder from "../Connections/ServiceConnectionBuilder";
import { DBQuery } from "../../../models/DatabaseBrowser";
import QueryPane from "./QueryPane";
import { UserContext } from "../../../store/User";
import { history } from "../../../configureStore";
import { getLocalStorage, setLocalStorage } from "../../../services/Utils";
import { Columns, getPgsqlCompletionProvider, Tables } from "./PgSQLCompletionProvider";
import { useWindowDimensions } from "../../../components/utils/utils";
import ColumnIcon from "../../../components/Icons/ColumnIcon";
const { Option } = Select;
const { Column } = Table;
const { SubMenu } = Menu;
const { DirectoryTree } = Tree;
const { TabPane } = Tabs;

type ObjType = "query" | "table";
export type EditorLang = "pgsql" | "mysql" | "cql";
interface DBPane {
  name: string;
  id: number | string;
  objectType: ObjType;
}

const getTableNameIn = (editorLang: EditorLang) => {
  switch (editorLang) {
    case "cql":
      return "Keyspace";
    case "pgsql":
      return "Schema";
    default:
      break;
  }
};
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

interface DBObject {
  title: any;
  key: string;
  icon?: JSX.Element;
  children?: DBObject[];
  isLeaf?: boolean;
}

const DatabaseBrowser: FC<{ orgSlugId: string; workspaceId: number; databaseId: number }> = ({ orgSlugId, workspaceId, databaseId }) => {
  const context = React.useContext(UserContext);
  const monacoIns = useMonaco();
  const { height, width } = useWindowDimensions();
  const [dbState, setDBState] = useState<{
    loading: boolean;
    connectionName: string;
    productName: string;
    version: string;
    dbName: string;
    schemas: string[];
    catalogs: string[];
    dbObjects: DBObject[];
    editMode: boolean;
    hasError: boolean;
    errorMsg?: string;
    editorLang: EditorLang;
    selectedSchema?: string;
  }>({
    loading: true,
    connectionName: "",
    productName: "",
    version: "",
    dbName: "",
    dbObjects: [],
    editMode: false,
    hasError: false,
    schemas: [],
    catalogs: [],
    editorLang: "pgsql",
  });

  const [dbQueries, setDBQueries] = useState<{ loading: boolean; queries: DBQuery[] }>({
    loading: true,
    queries: [],
  });

  const [dbTables, setDBTables] = useState<{ loading: boolean; tables: string[]; selectedTable?: string }>({
    tables: [],
    loading: true,
  });
  const [tablesMeta, setTablesMeta] = useState<{ loading: boolean; tableNames: Tables[]; columnNames: Columns[] }>({
    tableNames: [],
    columnNames: [],
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
      addToPane(qId, newQueryName, "query");
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
        if (s.productName.toLowerCase() === "mysql") {
          Connections.listSchemaObjects(databaseId, "default", (objs) => {
            setDBState({
              ...dbState,
              loading: false,
              productName: s.productName,
              dbName: s.dbName,
              dbObjects: makeTreeNodefromObj("default", objs),
              connectionName: s.connectionName,
              hasError: false,
              editMode: false,
              version: `${s.majorVersion}.${s.minorVersion}`,
              schemas: [],
              selectedSchema: "default",
              editorLang: "mysql",
            });
          });
        } else {
          Connections.listSchemas(databaseId, (schemas) => {
            const dbObjects = schemas.map((s) => {
              return {
                title: (
                  <Space align='center' size={-2}>
                    <i className='side-nav-icon'>
                      <FaNetworkWired size={14} style={{ marginTop: 5 }} />
                    </i>
                    <span>{s}</span>
                  </Space>
                ),
                key: s,
              };
            });
            if (s.productName.toLowerCase() === "postgresql") {
              setDBState({
                ...dbState,
                loading: false,
                connectionName: s.connectionName,
                productName: s.productName,
                dbName: s.dbName,
                version: `${s.majorVersion}.${s.minorVersion}`,
                schemas: schemas,
                dbObjects: dbObjects,
                hasError: false,
                editMode: false,
                selectedSchema: "public",
                editorLang: "pgsql",
              });
            } else if (s.productName.toLowerCase() == "cassandra") {
              setDBState({
                ...dbState,
                loading: false,
                dbName: s.dbName,
                connectionName: s.connectionName,
                productName: s.productName,
                version: `${s.majorVersion}.${s.minorVersion}`,
                schemas: schemas,
                dbObjects: dbObjects,
                hasError: false,
                editMode: false,
                selectedSchema: schemas[0],
                editorLang: "cql",
              });
            } else {
              setDBState({
                ...dbState,
                loading: false,
                productName: s.productName,
                dbName: s.dbName,
                connectionName: s.connectionName,
                hasError: false,
                editMode: false,
                version: `${s.majorVersion}.${s.minorVersion}`,
                schemas: schemas,
                selectedSchema: "na",
              });
            }
          });
        }
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

  const [dbTabs, setDBTabs] = useState<{ selectedPane?: DBPane; activeKey?: string; panes: DBPane[]; selectedTreeNode?: number | string }>({
    panes: [],
  });

  const onTabChange = (key: string) => {
    let selectedTabObj = "query";
    if (key.startsWith("t")) {
      selectedTabObj = "table";
    }
    const objId = Number(key.substring(2));
    let activePane = dbTabs.panes.find((p) => p.id === objId && p.objectType === selectedTabObj);
    setDBTabs({ ...dbTabs, activeKey: key, selectedPane: activePane, selectedTreeNode: key.slice(2) });
  };

  const onTabEdit = (targetKey: any, action: "add" | "remove") => {
    if (action === "remove") {
      let paneId: number | string;
      paneId = Number(targetKey.substring(2));
      let selectedTabObj = "query";
      if (targetKey.startsWith("t")) {
        selectedTabObj = "table";
        paneId = targetKey.slice(2);
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
            selectedTreeNode: filteredPanes[newActiveIndex].id,
          });
        } else {
          setDBTabs({
            ...dbTabs,
            panes: filteredPanes,
            selectedTreeNode: "",
          });
        }
      } else {
        setDBTabs({ ...dbTabs, activeKey: undefined, selectedPane: undefined, panes: [], selectedTreeNode: "" });
      }
    }
  };

  const updateQuery = (id: number | string, queryName: string) => {
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

  const onDeleteQuery = (id: number | string) => {
    onTabEdit(`q-${id}`, "remove");
    setDBQueries({ ...dbQueries, queries: dbQueries.queries.filter((p) => p.id !== id) });
  };

  const addToPane = (id: number | string, name: string, objType: ObjType) => {
    const newKey = `${objType.valueOf().substring(0, 1)}-${id}`;
    let newPanes = [...dbTabs.panes];
    if (newPanes.filter((p) => p.id === id && p.objectType === objType).length === 0) {
      newPanes = [...dbTabs.panes, { id: id, name: name, objectType: objType }];
    }
    setDBTabs({
      ...dbTabs,
      selectedPane: { name: name, id: id, objectType: objType },
      panes: newPanes,
      activeKey: newKey,
      selectedTreeNode: id,
    });
  };

  // useEffect(() => {
  //   if (dbState.selectedSchema) {
  //     Connections.listTables(databaseId, dbState.selectedSchema, dbState.productName, (tables) => {
  //       setDBTables({ ...dbTables, tables: tables, loading: false });
  //     });
  //   }
  // }, [dbState.selectedSchema, databaseId]);

  const handleDeleteConnection = () => {
    Connections.deleteConnection(databaseId, (r) => {
      message.success("Database Connection was deleted");
      Connections.listConnections((c) => {
        context.updateConnections(c);
      });
      history.push(`/${orgSlugId}/workspace/${workspaceId}/connections`);
    });
  };

  const onSelectTreeNode = (selectedKeys: any, info: any) => {
    if (selectedKeys.length > 0) {
      const splitKey = selectedKeys[0]?.split("--");
      const isOpenTab = dbTabs.panes.filter((t) => t.name === info.node.title);
      setDBState({ ...dbState, selectedSchema: splitKey[0] });
      if (isOpenTab?.length === 0 && splitKey?.length === 3 && splitKey?.includes("table")) {
        addToPane(info.node.key, info?.node?.title, "table");
      } else if (splitKey.length === 3 && splitKey.includes("table")) {
        setDBTabs({
          ...dbTabs,
          activeKey: `t-${info.node.key}`,
          selectedTreeNode: info.node.key,
        });
      }
    }
  };

  const fetchTableObjects = (key: string, resolve: () => void) => {
    const splitKey = key?.split("--");
    Connections.listTablesObjects(databaseId, splitKey[0], splitKey[2], (objs) => {
      let schemaLevel1Objs: DBObject[] = [];
      if (Object.entries(objs).length > 0) {
        Object.entries(objs).map(([keyName, value]) => {
          if (value.length > 0) {
            schemaLevel1Objs.push({
              title: keyName,
              key: `${key}--${keyName}`,
              icon: (
                <i className={`side-nav-icon`}>
                  <MdFolder />
                </i>
              ),
              children: value.map((r: any) => {
                return {
                  title: (
                    <Space size={4}>
                      <span>
                        {r.colName ? (
                          <>
                            {r.colName} {r.name ? `(${r.name})` : ""}
                          </>
                        ) : (
                          r.name
                        )}
                      </span>
                      <span className='label'>{r?.dataType}</span>
                    </Space>
                  ),
                  isLeaf: true,
                  key: `${key}--${keyName}--${r?.name}`,
                  icon: (
                    <i className={`column-icon`}>
                      <ColumnIcon dataType={r?.dataType ?? r.name} />
                    </i>
                  ),
                };
              }),
            });
          }
        });
      }
      const newDBObjects = dbState.dbObjects.map((k) => {
        if (k.key === splitKey[0]) {
          return {
            ...k,
            children: k.children.map((t) => {
              return {
                ...t,
                children: t.children.map((o) => {
                  if (o.key === key) {
                    return { ...o, children: schemaLevel1Objs };
                  } else {
                    return o;
                  }
                }),
              };
            }),
          };
        } else if (k.key.includes("default--table")) {
          return {
            ...k,
            children: k.children.map((t) => {
              if (t.key === key) {
                return {
                  ...t,
                  children: schemaLevel1Objs,
                };
              } else {
                return t;
              }
            }),
          };
        } else {
          return k;
        }
      });
      setDBState({ ...dbState, dbObjects: newDBObjects });
      resolve();
    });
  };

  const makeTreeNodefromObj = (key: string, objs: SchemaObjects) => {
    let schemaLevel1Objs: DBObject[] = [];
    if (objs.routines.length > 0) {
      schemaLevel1Objs.push({
        title: "routines",
        key: `${key}--routine`,
        icon: (
          <i className={`side-nav-icon`}>
            <MdFolder />
          </i>
        ),
        children: objs.routines.map((r) => {
          return {
            title: r,
            key: `${key}--routine--${r}`,
            icon: (
              <i className={`side-nav-icon`}>
                <MdOutlineFunctions />
              </i>
            ),
            isLeaf: true,
          };
        }),
      });
    }
    if (objs.tables.length > 0) {
      schemaLevel1Objs.push({
        title: "tables",
        key: `${key}--table`,
        icon: (
          <i className={`side-nav-icon`}>
            <MdFolder />
          </i>
        ),
        children: objs.tables.map((r) => {
          return {
            title: r,
            key: `${key}--table--${r}`,
            icon: (
              <i className={`side-nav-icon`}>
                <FaTable />
              </i>
            ),
          };
        }),
      });
    }
    if (objs.views.length > 0) {
      schemaLevel1Objs.push({
        title: "views",
        key: `${key}--view`,
        icon: (
          <i className={`side-nav-icon`}>
            <MdFolder />
          </i>
        ),
        children: objs.views.map((r) => {
          return {
            title: r,
            key: `${key}--view--${r}`,
            icon: (
              <i className={`side-nav-icon`}>
                <MdOutlineViewSidebar />
              </i>
            ),
            isLeaf: true,
          };
        }),
      });
    }

    return schemaLevel1Objs;
  };

  const fetchSchemaObjects = (key: string, resolve: () => void) => {
    Connections.listSchemaObjects(databaseId, key, (objs) => {
      const schemaLevel1Objs = makeTreeNodefromObj(key, objs);
      const newDBObjects = dbState.dbObjects.map((k) => {
        if (k.key === key) {
          return { ...k, children: schemaLevel1Objs };
        } else {
          return k;
        }
      });
      setDBState({ ...dbState, dbObjects: newDBObjects });
      resolve();
    });
  };

  const loadTables = ({ key, children }: any) =>
    new Promise<void>((resolve) => {
      if (children) {
        resolve();
        return;
      }
      if (key.includes("table")) {
        fetchTableObjects(key, resolve);
      } else {
        fetchSchemaObjects(key, resolve);
      }
    });

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

  const onSelectSavedQuery = (selectedQuery: DBQuery) => {
    addToPane(selectedQuery.id, selectedQuery.name, "query");
  };

  React.useEffect(() => {
    if (dbState.editorLang === "mysql") {
      Connections.listTablesMeta(databaseId, "default", (res) => {
        let tblNames: Tables[] = [];
        let colsNames: Columns[] = [];
        Object.entries(res).map(([tableName, value]) => {
          tblNames.push({ tblName: tableName, detail: `` });
          value.columns.map((col: ColumnDetails) => {
            colsNames.push({
              colName: col.name,
              detail: `Column in table ${tableName}: ${col.name} | ${col.dataType}`,
              tblName: tableName,
            });
          });
        });
        setTablesMeta({ tableNames: tblNames, columnNames: colsNames, loading: false });
      });
    } else if (dbState.editorLang === "pgsql" || dbState.editorLang === "cql") {
      Connections.listSchemas(databaseId, (schemas) => {
        if (schemas.length > 0) {
          let tblNames: Tables[] = [];
          let colsNames: Columns[] = [];
          schemas.map((schema) => {
            Connections.listTablesMeta(databaseId, schema, (res) => {
              Object.entries(res).map(([tableName, value]) => {
                tblNames.push({ tblName: tableName, detail: `Table in ${getTableNameIn(dbState.editorLang)} : ${schema}` });
                value.columns.map((col: ColumnDetails) => {
                  colsNames.push({
                    colName: col.name,
                    detail: `Column in table ${tableName}: ${col.name} | ${col.dataType}`,
                    tblName: tableName,
                  });
                });
                setTablesMeta({ tableNames: tblNames, columnNames: colsNames, loading: false });
              });
            });
          });
        }
      });
    }
  }, []);

  React.useEffect(() => {
    if (monacoIns && tablesMeta.columnNames.length > 0) {
      const pgsqlCompleteProvider = getPgsqlCompletionProvider(
        monacoIns,
        tablesMeta.tableNames,
        tablesMeta.columnNames,
        dbState.editorLang,
        databaseId
      );
      return () => {
        pgsqlCompleteProvider?.dispose();
      };
    }
  }, [monacoIns, tablesMeta.columnNames]);

  return (
    <Layout className='database-browser-wrapper ant-layout-has-sider'>
      <Content
        style={{
          width: "100%",
          display: "flex",
          overflow: "hidden",
        }}>
        {dbState.hasError && (
          <div className='error-box'>
            <Alert type='error' message={dbState.errorMsg} />
            <Space>
              <Button type='primary' onClick={(e) => enableEditMode()}>
                Edit Connection
              </Button>
              <Button type='default' className='delete-con-btn' onClick={(e) => deleteWarning(dbState.connectionName)}>
                Delete Connection
              </Button>
            </Space>
          </div>
        )}

        {!dbState.hasError && (
          <>
            <Resizable
              defaultSize={{
                width: "200px",
                height: "100vh",
              }}
              className='workspace-side-nav hex-sider-light'
              maxWidth='40%'
              minWidth='20%'>
              <Skeleton title={true} active avatar={{ shape: "square" }} paragraph={false} loading={dbState.loading}>
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

              <Tabs className='db-query-tabs' defaultActiveKey='database-object' onChange={() => {}}>
                <TabPane tab='Database Objects' key='database-object'>
                  <Skeleton title={false} active avatar={false} paragraph={{ rows: 4, width: "100%" }} loading={dbState.loading}>
                    <div style={{ padding: "0 10px" }}>
                      <Space size={4} style={{margin: "10px 0"}}>
                        <i className={`side-nav-icon`} style={{ marginRight: 2 }}>
                          <FaDatabase />
                        </i>
                        <span>{dbState?.dbName}</span>
                      </Space>
                      <Tree
                        className='db-objects'
                        showIcon
                        defaultSelectedKeys={["public"]}
                        loadData={loadTables}
                        treeData={dbState.dbObjects}
                        onSelect={onSelectTreeNode}
                        height={height - 130}
                        selectedKeys={[dbTabs.selectedTreeNode]}
                      />
                    </div>
                  </Skeleton>
                </TabPane>
                <TabPane tab='Queries' key='queries'>
                  <CustomScroll heightRelativeToParent='calc(100vh - 55px)'>
                    {dbQueries.queries.length > 0 ? (
                      <Menu theme='light' mode='inline' selectedKeys={[dbTabs?.activeKey]}>
                        {dbQueries.queries.map((qr, i) => (
                          <Menu.Item key={`q-${qr.id}`} className='query-item' onClick={() => onSelectSavedQuery(qr)}>
                            {qr.name}
                          </Menu.Item>
                        ))}
                      </Menu>
                    ) : (
                      <Empty description='No Saved Queries' />
                    )}
                  </CustomScroll>
                </TabPane>
              </Tabs>
            </Resizable>
            <div height-100 db-info-container className='tabs-content-wrapper' style={{ width: "100%", minWidth: "1px" }}>
              {!dbState.hasError && !tablesMeta.loading && (
                <Tabs
                  hideAdd
                  onChange={onTabChange}
                  activeKey={dbTabs.activeKey}
                  type='editable-card'
                  className='db-tabs'
                  onEdit={onTabEdit}>
                  {dbTabs.panes.map((pane) => (
                    <>
                      {pane.objectType === "table" && (
                        <TabPane
                          tabKey={`t-${pane.id}`}
                          tab={
                            <div className='db-tab-header' aria-details={pane.name} onAuxClick={(e) => {}}>
                              <FaTable />
                              <div>{pane.name}</div>
                            </div>
                          }
                          key={`t-${pane.id}`}>
                          <TablePane connectionId={databaseId} schema={dbState.selectedSchema} dbName={dbState.dbName} name={pane.name} />
                        </TabPane>
                      )}
                      {pane.objectType === "query" && (
                        <TabPane
                          tabKey={`q-${pane.id}`}
                          tab={
                            <div className='db-tab-header' aria-details={pane.name} onAuxClick={(e) => {}}>
                              <MdCode />
                              <div>{pane.name}</div>
                            </div>
                          }
                          key={`q-${pane.id}`}>
                          {tablesMeta.columnNames.length > 0 && (
                            <QueryPane
                              connectionId={databaseId}
                              queryId={pane.id}
                              name={pane.name}
                              onUpdateQueryName={updateQuery}
                              onDeleteQuery={onDeleteQuery}
                              editorLang={dbState.editorLang}
                            />
                          )}
                        </TabPane>
                      )}
                    </>
                  ))}
                </Tabs>
              )}
            </div>
          </>
        )}
        <div className='height-100 db-info-container'></div>
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
