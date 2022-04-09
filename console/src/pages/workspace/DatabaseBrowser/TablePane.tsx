import { Select, Skeleton, Table, Tabs } from "antd";
import Column from "antd/lib/table/Column";
import { TabPane } from "rc-tabs";
import React, { FC, ReactNode, useEffect, useState } from "react";
import { FaTable } from "react-icons/fa";
import { QueryExecutionResult } from "../../../models/DatabaseBrowser";
import Connections from "../../../services/Connections";

const TablePane: React.FC<{ schema: string; name: string; connectionId: number }> = ({ name, schema, connectionId }) => {
  const [tableData, setTableData] = useState<{ loading: boolean; result?: QueryExecutionResult }>({ loading: true });
  useEffect(() => {
    Connections.getTableData(connectionId, name, schema, (data) => {
      setTableData({ ...tableData, loading: false, result: data });
    });
  }, [name]);

  return (
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
  );
};

export default TablePane;
