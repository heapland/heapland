import Connections, { PrimaryKey } from "../../services/Connections";
import { isNumberDataType } from "../utils/utils";
import { DBInfo } from "./DBOperation";

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

  updateQuery(selectedRows: any[], primaryKeys: PrimaryKey[]) {
    const query = this.createUpdateQry(selectedRows[0], primaryKeys);
    return this.executeQuery(query);
  }

  deleteQuery(primaryKeys: PrimaryKey[]): any {
    let delete_query = "";
    this.rowsData.map((r) => {
      delete_query += `DELETE FROM ${this.dbInfo.selectedSchema}.${this.dbInfo.tableName} WHERE `;

      Object.entries(r).map(([key, value], i) => {
        if (!!primaryKeys.find((p) => p.colName === key)) {
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

  createInsertQry(primaryKeys: PrimaryKey[] = [], insertQuery: boolean = true, tableDefinition: boolean = false) {
    let arrData = this.rowsData;
    let colsData = this.colsNames;
    let keys = colsData.map((k) => k.name).join(",");
    let cql = "";
    let create_table = `CREATE TABLE ${this.dbInfo.tableName}(\r\n`;

    if (tableDefinition) {
      let row = "";
      for (let i = 0; i < colsData.length; i++) {
        if (colsData.length === i + 1 && primaryKeys.length === 0) {
          row += `${colsData[i].name}  \t  ${colsData[i].dataType}${
            primaryKeys.find((p) => p.colName === colsData[i].name) ? " PRIMARYKEY" : ""
          }\r\n`;
        } else {
          row += `${colsData[i].name}  \t  ${colsData[i].dataType}${
            primaryKeys.find((p) => p.colName === colsData[i].name) ? " PRIMARYKEY" : ""
          },\r\n`;
        }
      }

      if (primaryKeys.length > 0) {
        let pkeys: any[] = [];
        primaryKeys.map((p) => {
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

  createUpdateQry(oldColData: any[] = null, primaryKeys: PrimaryKey[] = []) {
    let arrData = this.rowsData;
    let colsData = this.colsNames;
    let cql = "";

    arrData.map((d) => {
      let cql_update = "UPDATE " + this.dbInfo.selectedSchema + "." + this.dbInfo.tableName + "\r\n" + "SET ";
      let condition = "WHERE ";

      colsData.map((c, i) => {
        console.log(!!Object.entries(oldColData).find(([key, value]) => value === d[c.name]));
        if (!!Object.entries(oldColData).find(([key, value]) => value === d[c.name])) return;
        if (isNumberDataType(c.dataType)) {
          cql_update += `${c.name} = ${d[c.name]},`;
        } else {
          cql_update += ` ${c.name} = '${d[c.name]}',`;
        }
      });

      Object.entries(oldColData ?? d).map(([key, value], i) => {
        if (!!primaryKeys.find((p) => p.colName === key)) {
          condition += `${key} =${typeof value === "number" ? value : `'${value}'`}`;
        }
      });
      cql_update = cql_update.slice(0, -1);
      cql_update += `\r\n${condition};\r\n\r\n`;
      cql += cql_update;
    });
    return cql;
  }
}
