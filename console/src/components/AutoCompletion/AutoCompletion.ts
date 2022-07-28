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

export const operatores = (editorLang: EditorLang, monaco: any, range: any) => {
  return [
    ...getLangDefComp(editorLang).operatores.map((o) => {
      return {
        label: o,
        kind: monaco.languages.CompletionItemKind.Operator,
        detail: o,
        range: range,
        insertText: o,
      };
    }),
  ];
};

export const langSnippet = (editorLang: EditorLang, monaco: any, range: any) => {
  return [
    ...getLangDefComp(editorLang).langSnippet.map((d) => {
      return {
        label: d.key,
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: d.detail,
        range: range,
        insertText: d.insertText,
      };
    }),
  ];
};

export const langkeyWords = (editorLang: EditorLang, monaco: any, range: any) => {
  return [
    ...getLangDefComp(editorLang).keyWords.map((k) => {
      return {
        label: k.key,
        kind: monaco.languages.CompletionItemKind.Keyword,
        detail: k.detail,
        range: range,
        insertText: k.key,
      };
    }),
  ];
};

export const dataTypes = (editorLang: EditorLang, monaco: any, range: any) => {
  return [
    ...getLangDefComp(editorLang).dataTypes.map((d) => {
      return {
        label: d.key,
        kind: monaco.languages.CompletionItemKind.Keyword,
        detail: d.detail,
        range: range,
        insertText: d.key,
      };
    }),
  ];
};

export const langFunctions = (editorLang: EditorLang, monaco: any, range: any) => {
  return [
    ...getLangDefComp(editorLang).functions.map((f) => {
      return {
        label: f.key,
        kind: monaco.languages.CompletionItemKind.Operator,
        detail: f.detail,
        range: range,
        insertText: f.insertText,
      };
    }),
  ];
};

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
    return [
      ...langSnippet(this.editorLang, this.monaco, this.range),
      ...langkeyWords(this.editorLang, this.monaco, this.range),
      ...operatores(this.editorLang, this.monaco, this.range),
      ...langFunctions(this.editorLang, this.monaco, this.range),
      ...dataTypes(this.editorLang, this.monaco, this.range),
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
          this.renderColumns,
          this.renderTables,
          langFunctions(this.editorLang, this.monaco, this.range),
          dataTypes(this.editorLang, this.monaco, this.range),
          langkeyWords(this.editorLang, this.monaco, this.range),
          langSnippet(this.editorLang, this.monaco, this.range),
          operatores(this.editorLang, this.monaco, this.range)
        );
      case "pgsql":
        return new PGSQlCompletion(
          this.tblNames,
          this.colsNames,
          this.splitQuery,
          this.monaco,
          this.range,
          this.defaultAutoCompletion,
          this.renderColumns,
          this.renderTables,
          langFunctions(this.editorLang, this.monaco, this.range),
          dataTypes(this.editorLang, this.monaco, this.range),
          langkeyWords(this.editorLang, this.monaco, this.range),
          langSnippet(this.editorLang, this.monaco, this.range),
          operatores(this.editorLang, this.monaco, this.range)
        );
      case "cql":
        return new CQLCompletion(
          this.tblNames,
          this.colsNames,
          this.splitQuery,
          this.monaco,
          this.range,
          this.defaultAutoCompletion,
          this.renderColumns,
          this.renderTables,
          langFunctions(this.editorLang, this.monaco, this.range),
          dataTypes(this.editorLang, this.monaco, this.range),
          langkeyWords(this.editorLang, this.monaco, this.range),
          langSnippet(this.editorLang, this.monaco, this.range),
          operatores(this.editorLang, this.monaco, this.range)
        );
      default:
        break;
    }
  }
}

export default AutoCompletion;
