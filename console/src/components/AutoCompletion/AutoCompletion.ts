import { EditorLang } from "../../pages/workspace/DatabaseBrowser/DatabaseBrowser";
import { Columns, Tables } from "../../pages/workspace/DatabaseBrowser/PgSQLCompletionProvider";
import PGSQlCompletion from "./PGSQLCopletioin";
import CQLCompletion from "./CQLCompletion";
import MySQLCompletion from "./MySQLCompletion";
import { getLangDefComp } from "../DBOperation/DBOperation";

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
      ...getLangDefComp(this.editorLang).langSnippet.map((d) => {
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
      ...getLangDefComp(this.editorLang).keyWords.map((k) => {
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
      ...getLangDefComp(this.editorLang).dataTypes.map((d) => {
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
      ...getLangDefComp(this.editorLang).operatores.map((o) => {
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
      ...getLangDefComp(this.editorLang).functions.map((f) => {
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
          this.langkeyWords,
          this.defaultAutoCompletion,
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
