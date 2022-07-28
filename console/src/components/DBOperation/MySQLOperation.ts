import Connections, { PrimaryKey } from "../../services/Connections";
import { isNumberDataType, isVarCharType } from "../utils/utils";
import { DBInfo } from "./DBOperation";
import { INewColName } from "./PGSQLOperation";

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

  createInsertQry(insertQuery: boolean = true, tableDefinition: boolean = false) {
    let arrData = this.rowsData;
    let colsData = this.colsNames;
    let keys = colsData.map((k) => k.name).join(",");
    let sql = "";
    let create_table = `CREATE TABLE ${this.dbInfo.tableName}(\r\n`;

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
      sql += `${create_table} \r\n\r\n`;
    }

    //1st loop is to extract each row

    if (insertQuery) {
      arrData.map((d) => {
        let sql_insert = "INSERT INTO " + this.dbInfo.tableName;
        let keyName = ` (${keys}) `;
        sql_insert += keyName;
        let value: any[] = [];

        colsData.map((c) => {
          if (isNumberDataType(c.dataType)) {
            value.push(d[c.name]);
          } else {
            value.push(`'${d[c.name]}'`);
          }
        });
        let joinValue = value.join(",");

        sql_insert += `VALUES(${joinValue});\r\n`;
        sql += sql_insert;
      });
    }

    return sql;
  }

  createUpdateQry(oldColData: any = null) {
    let arrData = this.rowsData;
    let colsData = this.colsNames;
    let sql = "";

    arrData.map((d) => {
      let sql_update = "UPDATE " + this.dbInfo.tableName + "\r\n" + "SET ";
      let condition = "WHERE ";

      colsData.map((c) => {
        if (isNumberDataType(c.dataType)) {
          sql_update += `${c.name} = ${d[c.name]},`;
        } else {
          sql_update += ` ${c.name} = '${d[c.name]}',`;
        }
      });

      Object.entries(oldColData ?? d).map(([key, value], i) => {
        if (Object.entries(oldColData ?? d).length === i + 1) {
          condition += `${key} =${typeof value === "number" ? value : `'${value}'`}`;
        } else {
          condition += `${key} = ${typeof value === "number" ? value : `'${value}'`} AND `;
        }
      });
      sql_update = sql_update.slice(0, -1);
      sql_update += `\r\n${condition};\r\n\r\n`;
      sql += sql_update;
    });
    return sql;
  }

  addNewColumn(allColsName: INewColName[]) {
    let sqlQuery = `ALTER TABLE ${this.dbInfo.tableName}\r\n`;
    let primary_keys: string[] = [];

    allColsName.map((c, i) => {
      if (c.primary_key) {
        primary_keys.push(c.colName);
      }
      if (allColsName.length === i + 1 && !c.primary_key) {
        if (isVarCharType(c.datatype)) {
          return (sqlQuery += `ADD COLUMN ${c.colName}  ${c.datatype}(${c.charNumber}) ${c.is_not_null ? "NOT NULL" : "NULL"};`);
        }
        return (sqlQuery += `ADD COLUMN ${c.colName}  ${c.datatype} ${c.is_not_null ? "NOT NULL" : "NULL"};`);
      } else {
        if (isVarCharType(c.datatype)) {
          return (sqlQuery += `ADD COLUMN ${c.colName}  ${c.datatype}(${c.charNumber}) ${c.is_not_null ? "NOT NULL" : "NULL"},\r\n`);
        }
        return (sqlQuery += `ADD COLUMN ${c.colName}  ${c.datatype} ${c.is_not_null ? "NOT NULL" : "NULL"},\r\n`);
      }
    });
    if (primary_keys.length) {
      sqlQuery += `ADD CONSTRAINT ${this.dbInfo.tableName}_pkys PRIMARY KEY (${primary_keys.join(",")});`;
    }
    return this.executeQuery(sqlQuery);
  }

  addNewTable(allColsName: INewColName[], schemaName: string, tableName: string, dbName?: string) {
    let sqlQuery = `CREATE TABLE ${dbName}.${tableName}(\r\n`;
    let primary_keys: string[] = [];
    let foreign_key = "";

    allColsName.map((c, i) => {
      if (c.primary_key) {
        primary_keys.push(c.colName);
      }

      if (c.foreign_key.length) {
        foreign_key += `CONSTRAINT ${c.foreign_key[0]}_${i}_fkey\r\n`;
        foreign_key += `FOREIGN KEY(${c.colName})\r\n`;
        foreign_key += `REFERENCES ${dbName}.${c.foreign_key[0]}(${c.foreign_key[1]})\r\n`;
      }

      if (allColsName.length === i + 1 && !c.primary_key) {
        if (isVarCharType(c.datatype)) {
          return (sqlQuery += `${c.colName}  ${c.datatype}(${c.charNumber}) ${c.is_not_null ? "NOT NULL" : "NULL"}\r\n);`);
        }
        return (sqlQuery += `${c.colName}  ${c.datatype} ${c.is_not_null ? "NOT NULL" : "NULL"}\r\n);`);
      } else {
        if (isVarCharType(c.datatype)) {
          return (sqlQuery += `${c.colName}  ${c.datatype}(${c.charNumber}) ${c.is_not_null ? "NOT NULL" : "NULL"},\r\n`);
        }
        return (sqlQuery += `${c.colName}  ${c.datatype} ${c.is_not_null ? "NOT NULL" : "NULL"},\r\n`);
      }
    });

    if (primary_keys.length) {
      sqlQuery += `PRIMARY KEY (${primary_keys.join(",")})\r\n);`;
    }

    if (foreign_key) {
      sqlQuery += foreign_key;
    }
    return this.executeQuery(sqlQuery);
  }
}
