import Editor, { Monaco, useMonaco } from "@monaco-editor/react";
import { useHotkeys } from "react-hotkeys-hook";
import { Alert, Button, Dropdown, Form, Input, Menu, message, Modal, Select, Skeleton, Space, Table, Tabs, Tooltip } from "antd";
import Column from "antd/lib/table/Column";
import { string } from "prop-types";
import { TabPane } from "rc-tabs";
import React, { FC, ReactNode, useEffect, useState } from "react";
import { FaTable } from "react-icons/fa";
import { MdCreateNewFolder, MdPlayCircle, MdSave, MdSync } from "react-icons/md";
import { QueryExecutionResult } from "../../../models/DatabaseBrowser";
import Connections from "../../../services/Connections";
import { InternalServerError } from "../../../services/SparkService";

type QueryResult = { err?: string; result?: QueryExecutionResult };

const QueryPane: FC<{
  connectionId: number;
  queryId: number;
  name: string;
  onUpdateQueryName: (id: number, newName: string) => void;
  onDeleteQuery: (id: number) => void;
}> = ({ connectionId, queryId, name, onUpdateQueryName, onDeleteQuery }) => {
  const [modalForm] = Form.useForm();
  const [queryView, setQueryView] = useState<{
    queryName: string;
    savedQuery: string;
    currentState: string;
    loading: boolean;
    saveAsModal: boolean;
    queryResults: QueryResult[];
  }>({
    queryName: name,
    savedQuery: "",
    currentState: "",
    loading: true,
    saveAsModal: false,
    queryResults: [],
  });

  useEffect(() => {
    Connections.getQuery(connectionId, queryId, (q) => {
      setQueryView({ ...queryView, loading: false, savedQuery: q.text, currentState: q.text });
    });
  }, [queryId]);

  const closeSaveAsModal = () => {
    modalForm.resetFields();
    setQueryView({ ...queryView, saveAsModal: false });
  };

  const updateQuery = (sendUpdate: boolean, queryName: string, text: string) => {
    Connections.updateQuery(connectionId, queryId, queryName, text, (res) => {
      if (sendUpdate) {
        if (res.success) {
          message.success("Query has been saved");
        } else {
          message.error("Failed to save the query");
        }
      }
    });
  };

  const deleteQuery = () => {
    Connections.deleteQuery(connectionId, queryId, (res) => {
      if (res.success) {
        message.success("Query has been deleted");
        onDeleteQuery(queryId);
      } else {
        message.error("Failed to delete the query");
      }
    });
  };

  const onSaveAsFormSubmission = (values: any) => {
    const newQueryName = values["queryName"];
    updateQuery(true, newQueryName, queryView.currentState);
    setQueryView({ ...queryView, queryName: newQueryName, saveAsModal: false });
    onUpdateQueryName(queryId, newQueryName);
  };

  const handleSaveAs = () => {
    modalForm.submit();
  };

  const openSaveAsModal = () => {
    setQueryView({ ...queryView, saveAsModal: true });
  };

  const runQuery = (q: string) => {
    const queries = q
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q !== "");
    const results = queries.map((q) => Connections.executeQuery(connectionId, q));
    Promise.all(results).then((values) => {
      const allResults: QueryResult[] = values.map((v) => {
        if (v.status === 200 && v.parsedBody) {
          return { result: v.parsedBody as QueryExecutionResult };
        } else {
          {
            return { err: (v.parsedBody as InternalServerError).message };
          }
        }
      });
      setQueryView({ ...queryView, queryResults: allResults });
    });
  };

  const menu = (
    <Menu>
      <Menu.Item key='1' onClick={(e) => openSaveAsModal()}>
        Save As
      </Menu.Item>
    </Menu>
  );

  const onEditorMount = (editor: any, monaco: Monaco) => {
    editor.addAction({
      id: "execute-run",
      label: "Run Query",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      contextMenuGroupId: "editor-cmds",

      run: (editor: any) => {
        console.log(editor.getValue());
        runQuery(editor.getValue());
      },
    });

    editor.addAction({
      id: "execute-save",
      label: "Save Query",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      contextMenuGroupId: "editor-cmds",

      run: (editor: any) => {
        updateQuery(true, queryView.queryName, editor.getValue());
      },
    });
  };

  return (
    <>
      <div className='query-container'>
        <div className='query-editor'>
          <div className='file-browser-controls'>
            <Space>
              <Tooltip title='Run Query'>
                <Button
                  size='small'
                  type='primary'
                  onClick={(e) => runQuery(queryView.currentState)}
                  className='control-btn'
                  icon={<MdPlayCircle />}>
                  <span>Run</span>
                </Button>
              </Tooltip>

              <Tooltip title='Save Query'>
                <Dropdown.Button
                  className='trigger-menu'
                  size='small'
                  onClick={(e) => updateQuery(true, queryView.queryName, queryView.currentState)}
                  overlay={menu}
                  trigger={["click"]}>
                  Save
                </Dropdown.Button>
              </Tooltip>
              <Tooltip title='Delete Query'>
                <Button className='trigger-menu' size='small' onClick={(e) => deleteQuery()}>
                  Delete
                </Button>
              </Tooltip>
            </Space>
          </div>
          {!queryView.loading && (
            <Editor
              height='40vh'
              defaultLanguage='sql'
              onMount={onEditorMount}
              language='sql'
              defaultValue={queryView.savedQuery}
              onChange={(v, ev) => {
                setQueryView({ ...queryView, currentState: v });
              }}
            />
          )}
          {queryView.queryResults.length > 0 && (
            <Tabs defaultActiveKey='0' className='query-tab'>
              {queryView.queryResults.map((qr, i) => (
                <TabPane key={i.toString()} tab={`Result ${i + 1}`}>
                  {qr.err && <Alert type='error' message={qr.err} />}
                  {qr.result && qr.result.resultSize == -1 && (
                    <Table
                      dataSource={qr.result.result}
                      rowKey={(c: any) => c.id}
                      scroll={{ x: "calc(100vw - 490px)" }}
                      pagination={false}
                      className='tbl-data'
                      style={{ minHeight: "20vh", backgroundColor: "#fff" }}>
                      {qr.result.columns.map((c, i) => (
                        <Column className='table-cell-light' key={i.toString()} title={c.name.toUpperCase()} dataIndex={c.name} />
                      ))}
                    </Table>
                  )}
                </TabPane>
              ))}
            </Tabs>
          )}
        </div>
        <Modal
          title={`Save ${queryView.queryName} query as`}
          visible={queryView.saveAsModal}
          onOk={handleSaveAs}
          onCancel={closeSaveAsModal}
          okText='Save'
          cancelText='Cancel'>
          <Form layout='vertical' form={modalForm} requiredMark={false} onFinish={onSaveAsFormSubmission} scrollToFirstError>
            <Form.Item name='queryName' label='Query name' rules={[{ required: true, message: "This field is required." }]}>
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
};

export default QueryPane;
