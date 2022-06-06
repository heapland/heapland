import { Select, Skeleton, Table, Tabs } from "antd";
import Column from "antd/lib/table/Column";
import React, { FC, ReactNode, useEffect, useState } from "react";
import { QueryExecutionResult } from "../../../models/DatabaseBrowser";
import Connections from "../../../services/Connections";
import TableActionHeader from "./TableActionHeader";
import "./DatabaseBrowser.scss";
import DownloadModal from "./DownloadModal";

const TablePane: React.FC<{ schema: string; name: string; connectionId: number; dbName: string }> = ({
  name,
  schema,
  connectionId,
  dbName,
}) => {
  const [tableData, setTableData] = useState<{ loading: boolean; result?: QueryExecutionResult }>({ loading: true });
  const [refres, setRefres] = useState<boolean>(false);
  const [isDownloadModal, setDownloadModal] = useState<boolean>(false);
  useEffect(() => {
    setTableData({ loading: true });
    Connections.getTableData(connectionId, name, schema, (data) => {
      setTableData({ ...tableData, loading: false, result: data });
    });
  }, [name, refres]);

  const onDownloadDataModal = () => {
    setDownloadModal(true);
  };

  const closeDownloadModal = () => {
    setDownloadModal(false);
  };

  return (
    <>
      <TableActionHeader
        onAddRow={() => {}}
        onDeleteRow={() => {}}
        onRefres={() => setRefres(!refres)}
        onDownloadDataModal={onDownloadDataModal}
        onUploadData={() => {}}
      />
      <Skeleton loading={tableData.loading} active paragraph={{ rows: 4 }}>
        <Table
          dataSource={tableData.result ? tableData.result.result : []}
          rowKey={(c: any) => c.id}
          scroll={{ x: "calc(100vw - 470px)" }}
          pagination={false}
          className='tbl-data'
          style={{ minHeight: "50vh", backgroundColor: "#fff" }}>
          {tableData.result &&
            tableData.result.columns.map((c) => (
              <Column className='table-cell-light' key={c.name} title={c.name.toUpperCase()} dataIndex={c.name} />
            ))}
        </Table>
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
