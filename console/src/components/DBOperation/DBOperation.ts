import { QueryExecutionResult } from "../../models/DatabaseBrowser";
import Connections from "../../services/Connections";
import { createSQLInsert, createSQLUpdate } from "../utils/utils";

interface DBInfo {
  tableName: string;
  selectedSchema: string;
  selectedRow?: any;
}

export class PGSQlOperation {
  rowsData: any[];
  dbInfo: DBInfo;
  connectionId: number;
  colsNames?: { name: string; dataType: string }[];
  constructor(rowsData: any, dbInfo: DBInfo, connectionId: number, colsNames?: { name: string; dataType: string }[]) {
    this.rowsData = rowsData;
    this.dbInfo = dbInfo;
    this.connectionId = connectionId;
    this.colsNames = colsNames;
  }

  addQuery() {
    const queryData = { result: this.rowsData, columns: this.colsNames };
    const query = createSQLInsert(queryData as QueryExecutionResult, this.dbInfo.selectedSchema, this.dbInfo.tableName, false, true);
    return this.executeQuery(query);
  }

  updateQuery() {
    const queryData = { result: this.rowsData, columns: this.colsNames };
    const query = createSQLUpdate(
      queryData as QueryExecutionResult,
      this.dbInfo.selectedSchema,
      this.dbInfo.tableName,
      this.dbInfo.selectedRow[0]
    );
    return this.executeQuery(query);
  }

  deleteQuery(): any {
    let delete_query = "";
    this.rowsData.map((r) => {
      delete_query += `DELETE FROM ${this.dbInfo.selectedSchema}.${this.dbInfo.tableName} WHERE `;

      Object.entries(r).map(([key, value], i) => {
        if (Object.entries(r).length === i + 1) {
          delete_query += `${key} =${typeof value === "number" ? value : `'${value}'`}; \n`;
        } else {
          delete_query += `${key} = ${typeof value === "number" ? value : `'${value}'`} AND `;
        }
      });

      delete_query = delete_query;
    });

    return this.executeQuery(delete_query);
  }
  executeQuery(query: string) {
    return Connections.executeQuery(this.connectionId, query);
  }
}
export class MySQlOperation {
  rowsData: any[];
  dbInfo: DBInfo;
  connectionId: number;
  colsNames?: { name: string; dataType: string }[];
  constructor(rowsData: any, dbInfo: DBInfo, connectionId: number, colsNames?: { name: string; dataType: string }[]) {
    this.rowsData = rowsData;
    this.dbInfo = dbInfo;
    this.connectionId = connectionId;
    this.colsNames = colsNames;
  }

  addQuery() {
    const queryData = { result: this.rowsData, columns: this.colsNames };
    const query = createSQLInsert(queryData as QueryExecutionResult, this.dbInfo.selectedSchema, this.dbInfo.tableName, false, true);
    return this.executeQuery(query);
  }

  updateQuery() {
    const queryData = { result: this.rowsData, columns: this.colsNames };
    const query = createSQLUpdate(
      queryData as QueryExecutionResult,
      this.dbInfo.selectedSchema,
      this.dbInfo.tableName,
      this.dbInfo.selectedRow[0]
    );
    return this.executeQuery(query);
  }

  deleteQuery(): any {
    let delete_query = "";
    this.rowsData.map((r) => {
      delete_query += `DELETE FROM ${this.dbInfo.selectedSchema}.${this.dbInfo.tableName} WHERE `;

      Object.entries(r).map(([key, value], i) => {
        if (Object.entries(r).length === i + 1) {
          delete_query += `${key} =${typeof value === "number" ? value : `'${value}'`}; \n`;
        } else {
          delete_query += `${key} = ${typeof value === "number" ? value : `'${value}'`} AND `;
        }
      });

      delete_query = delete_query;
    });

    return this.executeQuery(delete_query);
  }

  async executeQuery(query: string) {
    return await Connections.executeQuery(this.connectionId, query);
  }
}
export class CQlOperation {
  rowsData: any[];
  dbInfo: DBInfo;
  connectionId: number;
  colsNames?: { name: string; dataType: string }[];
  constructor(rowsData: any, dbInfo: DBInfo, connectionId: number, colsNames?: { name: string; dataType: string }[]) {
    this.rowsData = rowsData;
    this.dbInfo = dbInfo;
    this.connectionId = connectionId;
    this.colsNames = colsNames;
  }

  addQuery() {
    const queryData = { result: this.rowsData, columns: this.colsNames };
    const query = createSQLInsert(queryData as QueryExecutionResult, this.dbInfo.selectedSchema, this.dbInfo.tableName, false, true);
    return this.executeQuery(query);
  }

  updateQuery() {
    const queryData = { result: this.rowsData, columns: this.colsNames };
    const query = createSQLUpdate(
      queryData as QueryExecutionResult,
      this.dbInfo.selectedSchema,
      this.dbInfo.tableName,
      this.dbInfo.selectedRow[0]
    );
    return this.executeQuery(query);
  }

  deleteQuery(): any {
    let delete_query = "";
    this.rowsData.map((r) => {
      delete_query += `DELETE FROM ${this.dbInfo.selectedSchema}.${this.dbInfo.tableName} WHERE `;

      Object.entries(r).map(([key, value], i) => {
        if (Object.entries(r).length === i + 1) {
          delete_query += `${key} =${typeof value === "number" ? value : `'${value}'`}; \n`;
        } else {
          delete_query += `${key} = ${typeof value === "number" ? value : `'${value}'`} AND `;
        }
      });

      delete_query = delete_query;
    });

    return this.executeQuery(delete_query);
  }

  executeQuery(query: string) {
    return Connections.executeQuery(this.connectionId, query);
  }
}

class DBOperations {
  private productName: string;
  private connectionId: number;
  private tableName: string;
  private selectedSchema: string;
  constructor(productName: string, connectionId: number, tableName: string, selectedSchema: string) {
    this.productName = productName;
    this.connectionId = connectionId;
    this.tableName = tableName;
    this.selectedSchema = selectedSchema;
  }

  method(rowsData: any[], selectedRow: any, colsNames: { name: string; dataType: string }[]) {
    const dbInfo = { selectedRow, tableName: this.tableName, selectedSchema: this.selectedSchema };
    switch (this.productName.toLowerCase()) {
      case "postgresql":
        return new PGSQlOperation(rowsData, dbInfo, this.connectionId, colsNames);
      case "mysql":
        return new MySQlOperation(rowsData, dbInfo, this.connectionId, colsNames);
      case "cassandra":
        return new CQlOperation(rowsData, dbInfo, this.connectionId, colsNames);
    }
  }
}

export default DBOperations;
