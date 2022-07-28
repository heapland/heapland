import Connections, { PrimaryKey } from "../../services/Connections";
import { isNumberDataType, isVarCharType } from "../utils/utils";
import { DBInfo } from "./DBOperation";
import { INewColName } from "./PGSQLOperation";

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
    const query = this.createInsertQry();
    return this.executeQuery(query);
  }

  updateQuery(selectedRows: any[]) {
    const query = this.createUpdateQry(selectedRows[0]);
    return this.executeQuery(query);
  }

  deleteQuery(): any {
    let delete_query = "";
    this.rowsData.map((r) => {
      delete_query += `DELETE FROM ${this.dbInfo.selectedSchema}.${this.dbInfo.tableName} WHERE `;

      Object.entries(r).map(([key, value], i) => {
        if (!!this.dbInfo.primaryKeys.find((p) => p.colName === key)) {
          delete_query += `${key} =${typeof value === "number" ? value : `'${value}'`}; \n`;
        }
      });

      delete_query = delete_query;
    });

    return this.executeQuery(delete_query);
  }

  executeQuery(query: string) {
    return Connections.executeQuery(this.connectionId, query);
  }

  createInsertQry(insertQuery: boolean = true, tableDefinition: boolean = false) {
    let arrData = this.rowsData;
    let colsData = this.colsNames;
    let keys = colsData.map((k) => k.name).join(",");
    let cql = "";
    let create_table = `CREATE TABLE ${this.dbInfo.selectedSchema}.${this.dbInfo.tableName}(\r\n`;

    if (tableDefinition) {
      let row = "";
      for (let i = 0; i < colsData.length; i++) {
        if (colsData.length === i + 1 && this.dbInfo.primaryKeys.length === 0) {
          row += `${colsData[i].name}  \t  ${colsData[i].dataType}\r\n`;
        } else {
          row += `${colsData[i].name}  \t  ${colsData[i].dataType},\r\n`;
        }
      }

      if (this.dbInfo.primaryKeys.length > 0) {
        let pkeys: any[] = [];
        this.dbInfo.primaryKeys.map((p) => {
          pkeys.push(p.colName);
        });
        let joinPkeys = pkeys.join(",");
        row += `PRIMARY KEY   (${joinPkeys}) \r\n`;
      }

      create_table += row + ");";
      cql += `${create_table} \r\n\r\n`;
    }

    //1st loop is to extract each row

    if (insertQuery) {
      arrData.map((d) => {
        let cql_update = "INSERT INTO " + this.dbInfo.selectedSchema + "." + this.dbInfo.tableName;
        let keyName = ` (${keys}) `;
        cql_update += keyName;
        let value: any[] = [];

        colsData.map((c) => {
          if (isNumberDataType(c.dataType)) {
            value.push(d[c.name]);
          } else {
            value.push(`'${d[c.name]}'`);
          }
        });
        let joinValue = value.join(",");

        cql_update += `VALUES(${joinValue});\r\n`;
        cql += cql_update;
      });
    }

    return cql;
  }

  createUpdateQry(oldColData: any[] = null) {
    let arrData = this.rowsData;
    let colsData = this.colsNames;
    let cql = "";

    arrData.map((d) => {
      let cql_update = "UPDATE " + this.dbInfo.selectedSchema + "." + this.dbInfo.tableName + "\r\n" + "SET ";
      let condition = "WHERE ";

      colsData.map((c, i) => {
        if (!!this.dbInfo.primaryKeys.find((p) => p.colName === c.name)) return;
        if (isNumberDataType(c.dataType)) {
          cql_update += `${c.name} = ${d[c.name]},`;
        } else {
          cql_update += ` ${c.name} = '${d[c.name]}',`;
        }
      });

      Object.entries(oldColData ?? d).map(([key, value], i) => {
        if (!!this.dbInfo.primaryKeys.find((p) => p.colName === key)) {
          condition += `${key} =${typeof value === "number" ? value : `'${value}'`}`;
        }
      });
      cql_update = cql_update.slice(0, -1);
      cql_update += `\r\n${condition};\r\n\r\n`;
      cql += cql_update;
    });
    return cql;
  }

  addNewColumn(allColsName: INewColName[]) {
    let cqlQuery = `ALTER TABLE ${this.dbInfo.selectedSchema}.${this.dbInfo.tableName}\r\n`;
    let primary_keys: string[] = [];

    allColsName.map((c, i) => {
      if (c.primary_key) {
        primary_keys.push(c.colName);
      }
      if (allColsName.length === i + 1 && !c.primary_key) {
        if (isVarCharType(c.datatype)) {
          return (cqlQuery += `ADD COLUMN ${c.colName}  ${c.datatype}(${c.charNumber});`);
        }
        return (cqlQuery += `ADD COLUMN ${c.colName}  ${c.datatype};`);
      } else {
        if (isVarCharType(c.datatype)) {
          return (cqlQuery += `ADD COLUMN ${c.colName}  ${c.datatype}(${c.charNumber}),\r\n`);
        }
        return (cqlQuery += `ADD COLUMN ${c.colName}  ${c.datatype},\r\n`);
      }
    });
    if (primary_keys.length) {
      cqlQuery += `ADD CONSTRAINT ${this.dbInfo.tableName}_pkys PRIMARY KEY (${primary_keys.join(",")});`;
    }
    return this.executeQuery(cqlQuery);
  }

  addNewTable(allColsName: INewColName[], schemaName: string, tableName: string) {
    let cqlQuery = `CREATE TABLE ${schemaName}.${tableName}(\r\n`;
    let primary_keys: string[] = [];

    allColsName.map((c, i) => {
      if (c.primary_key) {
        primary_keys.push(c.colName);
      }
      if (allColsName.length === i + 1 && !c.primary_key) {
        if (isVarCharType(c.datatype)) {
          return (cqlQuery += `${c.colName}  ${c.datatype}(${c.charNumber})\r\n);`);
        }
        return (cqlQuery += `${c.colName}  ${c.datatype}\r\n);`);
      } else {
        if (isVarCharType(c.datatype)) {
          return (cqlQuery += `${c.colName}  ${c.datatype}(${c.charNumber}),\r\n`);
        }
        return (cqlQuery += `${c.colName}  ${c.datatype},\r\n`);
      }
    });

    if (primary_keys.length) {
      cqlQuery += `PRIMARY KEY (${primary_keys.join(",")})\r\n);`;
    }

    return this.executeQuery(cqlQuery);
  }
}
