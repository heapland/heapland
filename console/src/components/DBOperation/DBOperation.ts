import { PrimaryKey } from "../../services/Connections";
import { cqlSnippet, cqlDataTypes, cqlKeywords, cqlFunction, cql_operators } from "../DatabasesKeywords/CQL";
import { mySqlDataTypes } from "../DatabasesKeywords/MySQL";
import {
  CompletionInterface,
  pgsqlDataTypes,
  pgsqlFunction,
  pgsqlKeywords,
  pgsqlSnippet,
  pgsql_operators,
} from "../DatabasesKeywords/PgSQL";
import { CQlOperation } from "./CQLOperation";
import { MySQlOperation } from "./MySQLOperation";
import PGSQlOperation from "./PGSQLOperation";

export interface DBInfo {
  tableName: string;
  selectedSchema: string;
  primaryKeys: PrimaryKey[];
}

export const getLangDefComp = (editorLang: string) => {
  let langSnippet: CompletionInterface[];
  let dataTypes: CompletionInterface[];
  let keyWords: CompletionInterface[];
  let functions: CompletionInterface[];
  let operatores: string[];
  switch (editorLang) {
    case "pgsql":
      langSnippet = pgsqlSnippet;
      dataTypes = pgsqlDataTypes;
      keyWords = pgsqlKeywords;
      functions = pgsqlFunction;
      operatores = pgsql_operators;
      break;
    case "mysql":
      langSnippet = pgsqlSnippet;
      dataTypes = mySqlDataTypes;
      keyWords = pgsqlKeywords;
      functions = pgsqlFunction;
      operatores = pgsql_operators;
      break;
    case "cql":
      langSnippet = cqlSnippet;
      dataTypes = cqlDataTypes;
      keyWords = cqlKeywords;
      functions = cqlFunction;
      operatores = cql_operators;
      break;
    default:
      break;
  }
  return { langSnippet, dataTypes, keyWords, functions, operatores };
};

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
