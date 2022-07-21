import { PrimaryKey } from "../../services/Connections";
import { CQlOperation } from "./CQLOperation";
import { MySQlOperation } from "./MySQLOperation";
import PGSQlOperation from "./PGSQLOperation";

export interface DBInfo {
  tableName: string;
  selectedSchema: string;
  primaryKeys: PrimaryKey[];
}

class DBOperations {
  private productName: string;
  private connectionId: number;
  private tableName: string;
  private selectedSchema: string;
  private primaryKeys: PrimaryKey[];
  constructor(productName: string, connectionId: number, tableName: string, selectedSchema: string, primaryKeys: PrimaryKey[]) {
    this.productName = productName;
    this.connectionId = connectionId;
    this.tableName = tableName;
    this.selectedSchema = selectedSchema;
    this.primaryKeys = primaryKeys;
  }

  method(rowsData: any[], colsNames: { name: string; dataType: string }[]) {
    const dbInfo = { tableName: this.tableName, selectedSchema: this.selectedSchema, primaryKeys: this.primaryKeys };
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
