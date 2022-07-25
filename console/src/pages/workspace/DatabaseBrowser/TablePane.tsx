import { Select, Skeleton, Table, Tabs, Form, Input, InputNumber, Popconfirm, Typography, message, Modal, Button, Space } from "antd";
import Column from "antd/lib/table/Column";
import React, { useEffect, useState } from "react";
import { QueryExecutionResult } from "../../../models/DatabaseBrowser";
import Connections, { PrimaryKey, TableMeta } from "../../../services/Connections";
import TableActionHeader from "./TableActionHeader";
import "./DatabaseBrowser.scss";
import DownloadModal from "./DownloadModal";
import { copyTextToClipboard, extractPkeyfromTable, isNumberDataType, truncateString } from "../../../components/utils/utils";
import { InternalServerError } from "../../../services/SparkService";
import { Controlled as Codemirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import DBOperations from "../../../components/DBOperation/DBOperation";
import { EditorLang } from "./DatabaseBrowser";

const makeTableRowId = (c: [key: string]) => btoa(Object.values(c).join("-"));

const editorOptions = {
  mode: "shell",
  theme: "material",
  lineNumbers: true,
};

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: any;
  isNumber: boolean;
  record: any;
  index: number;
  children: React.ReactNode;
}

const EditableCell: React.FC<EditableCellProps> = ({ editing, dataIndex, title, isNumber, record, index, children, ...restProps }) => {
  const inputNode = isNumber ? (
    <InputNumber placeholder={title} />
  ) : (
    <Input placeholder={title?.toLowerCase()} style={{ minWidth: "50px" }} />
  );
  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          preserve={false}
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: false,
              message: `Please Input ${title}!`,
            },
          ]}>
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const TablePane: React.FC<{
  schema: string;
  name: string;
  connectionId: number;
  dbName: string;
  productName: string;
  allTables: TableMeta;
  editorLang: EditorLang;
}> = ({ name, schema, connectionId, dbName, productName, allTables, editorLang }) => {
  const [primaryKeys, setPrimarykeys] = useState<PrimaryKey[]>([]);

  const dbOps = new DBOperations(productName, connectionId, name, schema, primaryKeys);
  const [tableData, setTableData] = useState<{ loading: boolean; result?: QueryExecutionResult }>({ loading: true });

  const [showTableData, setShowTableData] = useState<{ currentPage: number; pageSize: number }>({
    currentPage: 1,
    pageSize: 50,
  });

  const [isNewData, setNewData] = useState<QueryExecutionResult>();
  const [openDDL, setOpenDDL] = useState(false);
  const [refres, setRefresh] = useState<boolean>(false);
  const [isDownloadModal, setDownloadModal] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState<any>("");
  const [isNewRow, setIsNewRow] = useState<any>(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);

  useEffect(() => {
    setTableData({ loading: true });
    Connections.getTableData(connectionId, name, schema, (data) => {
      const indexOfLastRow = showTableData.currentPage * showTableData.pageSize;
      const indexOfFirstRow = indexOfLastRow - showTableData.pageSize;
      const tableRowData = data.result.slice(indexOfFirstRow, indexOfLastRow);
      setTableData({ ...tableData, loading: false, result: { ...data, result: tableRowData } });
      setPrimarykeys(extractPkeyfromTable(allTables, name));
      setNewData(data);
    });
  }, [name, refres]);

  const openDwnDataModal = () => {
    setDownloadModal(true);
  };

  const closeDownloadModal = () => {
    setDownloadModal(false);
  };

  const rowSelection = {
    onChange: (selectedRowKeys: any[], rows: any[]) => {
      setSelectedRows(rows);
      setSelectedRowKeys(selectedRowKeys);
      if (rows.length === 0) {
        setEditingKey("");
      }
    },
  };

  const isEditing = (record: any) => makeTableRowId(record) === editingKey;

  const edit = (record: any) => {
    form.setFieldsValue({ ...record });
    setEditingKey(makeTableRowId(record));
  };

  const cancelToAddEditRow = () => {
    setEditingKey("");
    if (isNewRow) {
      const restData = tableData.result.result.filter((r, i) => makeTableRowId(r) !== makeTableRowId(selectedRows[0]));
      setTableData({ ...tableData, result: { ...tableData.result, result: restData } });
      setIsNewRow(false);
    }
  };

  const addRow = () => {
    if (editingKey) return;
    setIsNewRow(true);
    let newData: any = {};
    tableData.result.columns.map((c, i) => {
      if (c.name === "id") {
        newData[c.name] = `${tableData.result.result.length + 1}`;
      } else if (isNumberDataType(c.dataType)) {
        newData[c.name] = tableData.result.result.length + 1;
      } else {
        newData[c.name] = `new_${c.name}_${tableData.result.result.length + 1}`;
      }
    });
    setEditingKey(`${makeTableRowId(newData)}`);
    setSelectedRowKeys([makeTableRowId(newData)]);
    setSelectedRows([newData]);
    setTableData({ ...tableData, result: { ...tableData.result, result: [...tableData.result.result, newData] } });
  };

  const save = async (selectedrow: any) => {
    try {
      const row = (await form.validateFields()) as any;
      const newData = [...tableData.result.result];
      const index = isNewData.result.findIndex((item) => makeTableRowId(item) === makeTableRowId(selectedrow));
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, {
          ...item,
          ...row,
        });
        const res = await dbOps.method([row], tableData.result.columns).updateQuery(selectedRows);
        if (res.status === 200 && res.parsedBody) {
          message.success("Query execute successfully");
          setRefresh(!refres);
        } else if (res.status === 400 && res.parsedBody) {
          let err = res.parsedBody as InternalServerError;
          message.error(err.message);
          setRefresh(!refres);
        }
        setTableData({ ...tableData, result: { ...tableData.result, result: newData } });
        setEditingKey("");
        setSelectedRows([]);
        setSelectedRowKeys([]);
      } else {
        newData.push(row);
        const res = await dbOps.method([row], tableData.result.columns).addQuery();
        if (res.status === 200 && res.parsedBody) {
          message.success("Query execute successfully");
          setRefresh(!refres);
        } else if (res.status === 400 && res.parsedBody) {
          let err = res.parsedBody as InternalServerError;
          message.error(err.message);
          setRefresh(!refres);
        }
        setTableData({ ...tableData, result: { ...tableData.result, result: newData } });
        setEditingKey("");
        setSelectedRows([]);
        setSelectedRowKeys([]);
        setIsNewRow(false);
      }
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };

  const columns: any[] = [];

  tableData?.result?.columns.map((c, i) => {
    columns.push({
      title: c.name.toUpperCase(),
      dataIndex: c.name,
      dataType: c.dataType,
      // ellipsis: true,
      editable: true,
      className: "table-cell-light",
    });
  });

  const mergedColumns = columns.map((col: any) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: any) => ({
        record,
        isNumber: isNumberDataType(col?.dataType),
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const onDeleteRow = async (rows: any[]) => {
    const res = await dbOps.method(rows, tableData.result.columns).deleteQuery();

    if (res.status === 200 && res.parsedBody) {
      message.success("Query execute successfully");
      setRefresh(!refres);
      setSelectedRows([]);
      setEditingKey("");
    } else if (res.status === 400 && res.parsedBody) {
      let err = res.parsedBody as InternalServerError;
      message.error(err.message);
      setRefresh(!refres);
    }
  };
  const onPagiChange = (currentPage: number, rowPerPage: number) => {
    // Logic for displaying todos
    const indexOfLastRow = currentPage * rowPerPage;
    const indexOfFirstRow = indexOfLastRow - rowPerPage;
    const tableRowData = isNewData.result.slice(indexOfFirstRow, indexOfLastRow);
    setTableData({ ...tableData, result: { ...tableData.result, result: tableRowData } });
    setShowTableData({
      ...showTableData,
      currentPage: currentPage,
    });
  };

  const closeDDLModal = () => {
    setOpenDDL(false);
  };

  return (
    <>
      <TableActionHeader
        onEditRow={() => edit(selectedRows[0])}
        onSaveRow={() => save(selectedRows[0])}
        openDDL={() => setOpenDDL(true)}
        onCancel={cancelToAddEditRow}
        onAddRow={addRow}
        onDeleteRow={() => onDeleteRow(selectedRows)}
        onRefresh={() => setRefresh(!refres)}
        openDwnDataModal={openDwnDataModal}
        onUploadData={() => {}}
        selectedRow={selectedRows}
        editingKey={editingKey}
        onPagiChange={onPagiChange}
        currentPage={showTableData.currentPage}
        pageSize={showTableData.pageSize}
        totalRows={isNewData?.result?.length}
        loading={tableData.loading}
      />
      <Skeleton loading={tableData.loading} title={false} active paragraph={{ rows: 4, width: "100%" }}>
        <Form form={form} component={false}>
          <Table
            rowSelection={{
              type: "checkbox",
              ...rowSelection,
              selectedRowKeys: selectedRowKeys,
            }}
            components={{
              body: {
                cell: EditableCell,
              },
            }}
            size='small'
            rowKey={(c) => makeTableRowId(c)}
            columns={mergedColumns}
            dataSource={tableData.result ? tableData.result.result : []}
            scroll={{ x: "calc(100vw - 600px)" }}
            pagination={false}
            className='tbl-data'
            style={{ minHeight: "50vh" }}
          />
        </Form>
      </Skeleton>
      {isDownloadModal && (
        <DownloadModal
          schema={schema}
          tableName={name}
          dbName={dbName}
          connectionId={connectionId}
          isDownloadModal={isDownloadModal}
          closeDownloadModal={closeDownloadModal}
          tableData={tableData.result}
          dbLang={editorLang}
          dbOps={dbOps}
        />
      )}
      {openDDL && (
        <Modal
          width={600}
          centered
          className='download-modal-wrapper'
          title='Auto Generated Definition'
          visible={openDDL}
          footer={
            <Space>
              <Button onClick={closeDDLModal} className='cancel-modal-btn'>
                Cancel
              </Button>
              <Button
                type='primary'
                onClick={() =>
                  copyTextToClipboard(dbOps.method(tableData.result.result, tableData.result.columns).createInsertQry(false, true))
                }>
                Copy to Clipboard
              </Button>
            </Space>
          }
          onCancel={closeDDLModal}>
          <Codemirror
            className=''
            autoCursor={true}
            value={dbOps.method(tableData.result.result, tableData.result.columns).createInsertQry(false, true)}
            options={editorOptions}
            onBeforeChange={(editor, data, value: string) => {}}
            onChange={(editor, data, value) => {}}
          />
        </Modal>
      )}
    </>
  );
};

export default TablePane;
