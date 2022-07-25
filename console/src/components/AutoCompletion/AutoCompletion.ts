import { EditorLang } from "../../pages/workspace/DatabaseBrowser/DatabaseBrowser";
import { Columns, Tables } from "../../pages/workspace/DatabaseBrowser/PgSQLCompletionProvider";
import {
  pgsql_operators,
  pgsqlFunction,
  pgsqlKeywords,
  CompletionInterface,
  pgsqlSnippet,
  pgsqlDataTypes,
} from "../DatabasesKeywords/PgSQL";
import { cql_operators, cqlFunction, cqlKeywords, cqlDataTypes, cqlSnippet } from "../DatabasesKeywords/CQL";
import PGSQlCompletion from "./PGSQLCopletioin";
import CQLCompletion from "./CQLCompletion";
import MySQLCompletion from "./MySQLCompletion";

export interface ICompletionItem {
  label: string;
  kind: any;
  detail: string;
  range: any;
  insertText: string;
}

class AutoCompletion {
  private editorLang: EditorLang;
  private tblNames: Tables[];
  private colsNames: Columns[];
  private splitQuery: string[];
  private monaco: any;
  private range: any;
  constructor(editorLang: EditorLang, tblNames: Tables[], colsNames: Columns[], splitQuery: string[], monaco: any, range: any) {
    this.editorLang = editorLang;
    this.tblNames = tblNames;
    this.colsNames = colsNames;
    this.splitQuery = splitQuery;
    this.monaco = monaco;
    this.range = range;
  }

  defaultAutoCompletion() {
    return [...this.langSnippet(), ...this.langkeyWords(), ...this.operatores(), ...this.langFunctions(), ...this.dataTypes()];
  }

  langSnippet() {
    return [
      ...this.getLangDefComp().langSnippet.map((d) => {
        return {
          label: d.key,
          kind: this.monaco.languages.CompletionItemKind.Snippet,
          detail: d.detail,
          range: this.range,
          insertText: d.insertText,
        };
      }),
    ];
  }

  langkeyWords() {
    return [
      ...this.getLangDefComp().keyWords.map((k) => {
        return {
          label: k.key,
          kind: this.monaco.languages.CompletionItemKind.Keyword,
          detail: k.detail,
          range: this.range,
          insertText: k.key,
        };
      }),
    ];
  }

  renderColumns(colsName: Columns[] = null) {
    if (colsName) {
      return [
        ...colsName.map((c) => {
          return {
            label: c.colName,
            kind: this.monaco.languages.CompletionItemKind.Value,
            detail: c.detail,
            range: this.range,
            insertText: c.colName,
          };
        }),
      ];
    }
    return [
      ...this.colsNames.map((c) => {
        return {
          label: c.colName,
          kind: this.monaco.languages.CompletionItemKind.Value,
          detail: c.detail,
          range: this.range,
          insertText: c.colName,
        };
      }),
    ];
  }

  renderTables() {
    return [
      ...this.tblNames.map((t) => {
        return {
          label: t.tblName,
          kind: this.monaco.languages.CompletionItemKind.Field,
          range: this.range,
          detail: t.detail,
          insertText: t.insertText,
        };
      }),
    ];
  }

  dataTypes() {
    return [
      ...this.getLangDefComp().dataTypes.map((d) => {
        return {
          label: d.key,
          kind: this.monaco.languages.CompletionItemKind.Keyword,
          detail: d.detail,
          range: this.range,
          insertText: d.key,
        };
      }),
    ];
  }

  operatores() {
    return [
      ...this.getLangDefComp().operatores.map((o) => {
        return {
          label: o,
          kind: this.monaco.languages.CompletionItemKind.Operator,
          detail: o,
          range: this.range,
          insertText: o,
        };
      }),
    ];
  }

  langFunctions() {
    return [
      ...this.getLangDefComp().functions.map((f) => {
        return {
          label: f.key,
          kind: this.monaco.languages.CompletionItemKind.Operator,
          detail: f.detail,
          range: this.range,
          insertText: f.insertText,
        };
      }),
    ];
  }

  getLangDefComp() {
    let langSnippet: CompletionInterface[];
    let dataTypes: CompletionInterface[];
    let keyWords: CompletionInterface[];
    let functions: CompletionInterface[];
    let operatores: string[];

    switch (this.editorLang) {
      case "pgsql":
      case "mysql":
        langSnippet = pgsqlSnippet;
        dataTypes = pgsqlDataTypes;
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
  }



  queryMethod() {
    switch (this.editorLang) {
      case "mysql":
        return new MySQLCompletion(
          this.tblNames,
          this.colsNames,
          this.splitQuery,
          this.monaco,
          this.range,
          this.defaultAutoCompletion,
          this.langkeyWords,
          this.langSnippet,
          this.renderColumns,
          this.renderTables,
          this.dataTypes,
          this.operatores,
          this.langFunctions
        );
      case "pgsql":
        return new PGSQlCompletion(
          this.tblNames,
          this.colsNames,
          this.splitQuery,
          this.monaco,
          this.range,
          this.defaultAutoCompletion,
          this.langkeyWords,
          this.langSnippet,
          this.renderColumns,
          this.renderTables,
          this.dataTypes,
          this.operatores,
          this.langFunctions
        );
      case "cql":
        return new CQLCompletion(
          this.tblNames,
          this.colsNames,
          this.splitQuery,
          this.monaco,
          this.range,
          this.defaultAutoCompletion,
          this.langkeyWords,
          this.langSnippet,
          this.renderColumns,
          this.renderTables,
          this.dataTypes,
          this.operatores,
          this.langFunctions
        );
      default:
        break;
    }
  }
}

export default AutoCompletion;
