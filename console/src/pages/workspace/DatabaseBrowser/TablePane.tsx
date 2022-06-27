import { Select, Skeleton, Table, Tabs, Form, Input, InputNumber, Popconfirm, Typography, message } from "antd";
import Column from "antd/lib/table/Column";
import React, { useEffect, useState } from "react";
import { QueryExecutionResult } from "../../../models/DatabaseBrowser";
import Connections from "../../../services/Connections";
import TableActionHeader from "./TableActionHeader";
import "./DatabaseBrowser.scss";
import DownloadModal from "./DownloadModal";
import { createSQLInsert, createSQLUpdate, truncateString } from "../../../components/utils/utils";
import { InternalServerError } from "../../../services/SparkService";

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: any;
  inputType: "number" | "text";
  record: any;
  index: number;
  children: React.ReactNode;
}

const EditableCell: React.FC<EditableCellProps> = ({ editing, dataIndex, title, inputType, record, index, children, ...restProps }) => {
  const inputNode = inputType === "number" ? <InputNumber /> : <Input style={{ minWidth: "50px" }} />;

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
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

const TablePane: React.FC<{ schema: string; name: string; connectionId: number; dbName: string }> = ({
  name,
  schema,
  connectionId,
  dbName,
}) => {
  const [tableData, setTableData] = useState<{ loading: boolean; result?: QueryExecutionResult }>({ loading: true });
  const [showTableData, setShowTableData] = useState<{ currentPage: number; pageSize: number }>({
    currentPage: 1,
    pageSize: 50,
  });

  const [isNewData, setNewData] = useState<QueryExecutionResult>();
  const [refres, setRefres] = useState<boolean>(false);
  const [isDownloadModal, setDownloadModal] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState<any>("");
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);

  useEffect(() => {
    setTableData({ loading: true });
    Connections.getTableData(connectionId, name, schema, (data) => {
      const indexOfLastRow = showTableData.currentPage * showTableData.pageSize;
      const indexOfFirstRow = indexOfLastRow - showTableData.pageSize;
      const tableRowData = data.result.slice(indexOfFirstRow, indexOfLastRow);
      setTableData({ ...tableData, loading: false, result: { ...data, result: tableRowData } });
      setNewData(data);
    });
  }, [name, refres]);

  const onDownloadDataModal = () => {
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

  const isEditing = (record: any) => record.id === editingKey;

  const edit = (record: any) => {
    form.setFieldsValue({ ...record });
    setEditingKey(record.id);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const addRow = () => {
    let newData: any = {};
    tableData.result.columns.map((c, i) => {
      if (c.name === "id") {
        newData[c.name] = `${tableData.result.result.length + 1}`;
      } else {
        newData[c.name] = "";
      }
    });
    setEditingKey(`${newData.id}`);
    setSelectedRowKeys([newData.id]);
    setSelectedRows([...selectedRows, newData]);
    setTableData({ ...tableData, result: { ...tableData.result, result: [...tableData.result.result, newData] } });
  };

  const save = async (id: React.Key) => {
    try {
      const row = (await form.validateFields()) as any;
      const newData = [...tableData.result.result];
      const index = isNewData.result.findIndex((item) => id === item.id);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, {
          ...item,
          ...row,
        });
        let queryData = { result: [row], columns: tableData.result.columns };
        const res = await Connections.executeQuery(
          connectionId,
          createSQLUpdate(queryData as QueryExecutionResult, schema, name, editingKey)
        );
        if (res.status === 200 && res.parsedBody) {
          message.success("Query execute successfully");
          setRefres(!refres);
        } else if (res.status === 400 && res.parsedBody) {
          let err = res.parsedBody as InternalServerError;
          message.error(err.message);
          setRefres(!refres);
        }
        setTableData({ ...tableData, result: { ...tableData.result, result: newData } });
        setEditingKey("");
      } else {
        newData.push(row);
        let queryData = { result: [row], columns: tableData.result.columns };
        const res = await Connections.executeQuery(connectionId, createSQLInsert(queryData as QueryExecutionResult, schema, name, false));
        if (res.status === 200 && res.parsedBody) {
          message.success("Query execute successfully");
          setRefres(!refres);
        } else if (res.status === 400 && res.parsedBody) {
          let err = res.parsedBody as InternalServerError;
          message.error(err.message);
          setRefres(!refres);
        }
        setTableData({ ...tableData, result: { ...tableData.result, result: newData } });
        setEditingKey("");
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
      editable: true,
      className: "table-cell-light",
    });
  });

  const mergedColumns = columns.map((col: any) => {
    if (!col.editable) {
      console.log(col);
      return col;
    }
    return {
      ...col,
      onCell: (record: any) => ({
        record,
        inputType: col.dataType === "int8" ? "number" : "text",
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const onDeleteRow = async (rows: any[]) => {
    let delete_query = "";
    rows.map((r) => {
      delete_query += `DELETE FROM ${schema}.${name} WHERE id = '${r.id}';`;
    });

    let queryData = delete_query;
    const res = await Connections.executeQuery(connectionId, queryData);
    if (res.status === 200 && res.parsedBody) {
      message.success("Query execute successfully");
      setRefres(!refres);
    } else if (res.status === 400 && res.parsedBody) {
      let err = res.parsedBody as InternalServerError;
      message.error(err.message);
      setRefres(!refres);
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

  return (
    <>
      <TableActionHeader
        onEditRow={() => edit(selectedRows[0])}
        onSaveRow={() => save(editingKey)}
        onCancel={cancel}
        onAddRow={addRow}
        onDeleteRow={() => onDeleteRow(selectedRows)}
        onRefres={() => setRefres(!refres)}
        onDownloadDataModal={onDownloadDataModal}
        onUploadData={() => {}}
        selectedRow={selectedRows}
        editingKey={editingKey}
        onPagiChange={onPagiChange}
        currentPage={showTableData.currentPage}
        pageSize={showTableData.pageSize}
        totalRows={isNewData?.result?.length}
      />
      <Skeleton loading={tableData.loading} active paragraph={{ rows: 4 }}>
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
            rowKey={(c) => c.id}
            columns={mergedColumns}
            dataSource={tableData.result ? tableData.result.result : []}
            scroll={{ x: "calc(100vw - 600px)" }}
            pagination={false}
            className='tbl-data'
            style={{ minHeight: "50vh" }}
          />
        </Form>
      </Skeleton>
      <DownloadModal
        schema={schema}
        tableName={name}
        dbName={dbName}
        connectionId={connectionId}
        isDownloadModal={isDownloadModal}
        closeDownloadModal={closeDownloadModal}
        tableData={tableData.result}
      />
    </>
  );
};

export default TablePane;
