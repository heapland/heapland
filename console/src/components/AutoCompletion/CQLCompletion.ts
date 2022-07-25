import {
  Columns,
  getFilterTableCols,
  getFilterTableColsWithDot,
  Tables,
} from "../../pages/workspace/DatabaseBrowser/PgSQLCompletionProvider";
import { ICompletionItem } from "./AutoCompletion";

class CQLCompletion {
  private tblNames: Tables[];
  private colsNames: Columns[];
  private splitQuery: string[];
  private monaco: any;
  private range: any;
  private defaultAutoCompletion: () => ICompletionItem[];
  private langkeyWords: () => ICompletionItem[];
  private langSnippet: () => ICompletionItem[];
  private renderColumns: (col?: Columns[]) => ICompletionItem[];
  private renderTables: () => ICompletionItem[];
  private dataTypes: () => ICompletionItem[];
  private operatores: () => ICompletionItem[];
  private langFunctions: () => ICompletionItem[];
  constructor(
    tblNames: Tables[],
    colsNames: Columns[],
    splitQuery: string[],
    monaco: any,
    range: any,
    defaultAutoCompletion: () => ICompletionItem[],
    langkeyWords: () => ICompletionItem[],
    langSnippet: () => ICompletionItem[],
    renderColumns: (col?: Columns[]) => ICompletionItem[],
    renderTables: () => ICompletionItem[],
    dataTypes: () => ICompletionItem[],
    operatores: () => ICompletionItem[],
    langFunctions: () => ICompletionItem[]
  ) {
    this.tblNames = tblNames;
    this.colsNames = colsNames;
    this.splitQuery = splitQuery;
    this.monaco = monaco;
    this.range = range;
    this.defaultAutoCompletion = defaultAutoCompletion;
    this.langkeyWords = langkeyWords;
    this.langSnippet = langSnippet;
    this.renderColumns = renderColumns;
    this.renderTables = renderTables;
    this.dataTypes = dataTypes;
    this.operatores = operatores;
    this.langFunctions = langFunctions;
  }

  selectQuery(selectedLineContent: string, query: string, lastQueryWord: string, lastScndQryWord: string) {
    if (selectedLineContent.includes("join")) {
      let items;
      const beforeJoinVarArr = selectedLineContent
        .trim()
        .match(/(?<=from\s).*(?=\sjoin)/gi)[0]
        .replace("'", "")
        .split(" ");
      const afterJoinVarArr = selectedLineContent
        .trim()
        .match(/(?<=join\s).*(?=\son)/gi)[0]
        .replace("'", "")
        .split(" ");

      const regexBeforeJoin = new RegExp(beforeJoinVarArr[1], "g");
      const regexAfterJoin = new RegExp(afterJoinVarArr[1], "g");
      // console.log("after", query.match(regexAfterJoin));
      // console.log("before", query.match(regexBeforeJoin));
      // console.log("var", query);

      if (query.match(regexAfterJoin)?.length) {
        items = [
          ...getFilterTableCols(this.colsNames, afterJoinVarArr[0]).map((c) => {
            return {
              label: c.colName,
              kind: this.monaco.languages.CompletionItemKind.Value,
              detail: c.detail,
              range: this.range,
              insertText: c.colName,
            };
          }),
        ];
      } else if (query.match(regexBeforeJoin)?.length) {
        items = [
          ...getFilterTableCols(this.colsNames, beforeJoinVarArr[0]).map((c) => {
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
      return items;
    } else if (!this.splitQuery[1] || lastQueryWord?.slice(-1) === ",") {
      return [
        {
          label: "*",
          kind: this.monaco.languages.CompletionItemKind.Field,
          detail: "Select all fields",
          range: this.range,
          insertText: "*",
        },
        ...this.renderColumns(),
        ...this.renderTables(),
      ];
    } else if (this.splitQuery[this.splitQuery.length - 1]) {
      return this.renderColumns(getFilterTableColsWithDot(this.colsNames, this.splitQuery[this.splitQuery.length - 1]));
    } else if (lastQueryWord === "from") {
      return this.renderTables();
    } else {
      return [...this.langkeyWords(), ...this.dataTypes(), ...this.operatores()];
    }
  }

  createQuery() {
    return [...this.langkeyWords(), ...this.dataTypes(), ...this.operatores()];
  }

  insertQuery() {
    if (this.splitQuery[2] && this.splitQuery[3] === "(") {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[2]);
      return this.renderColumns(newCols);
    } else if (this.splitQuery[3]?.includes(",")) {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[2]);
      return this.renderColumns(newCols);
    } else if (this.splitQuery[1] === "into" && !this.splitQuery[2]) {
      return this.renderTables();
    }
  }

  updateQuery() {
    if (!this.splitQuery[1]) {
      return this.renderTables();
    } else if (this.splitQuery[1] && this.splitQuery[2] === "set" && !this.splitQuery.includes("where")) {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[1]);
      return this.renderColumns(newCols);
    } else if (this.splitQuery.includes("where")) {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[1]);
      return [...this.renderColumns(newCols), ...this.operatores()];
    } else {
      return [...this.langkeyWords(), ...this.dataTypes(), ...this.operatores()];
    }
  }

  deleteQuery() {
    if (!this.splitQuery[2]) {
      return this.renderTables();
    } else if (this.splitQuery.includes("where")) {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[2]);
      return [...this.renderColumns(newCols), ...this.operatores()];
    } else {
      return [...this.langkeyWords(), ...this.dataTypes(), ...this.operatores()];
    }
  }

  alterTable() {
    if (this.splitQuery[0] === "alter") {
      return [...this.langkeyWords(), ...this.dataTypes(), ...this.operatores()];
    } else if ((this.splitQuery[1] === "table" || this.splitQuery[1] === "keyspace") && !this.splitQuery[2]) {
      return this.renderTables();
    } else if (this.splitQuery[2] && this.splitQuery[3] === "add" && this.splitQuery[4] !== "constraint") {
      return [...this.dataTypes()];
    } else if (this.splitQuery[2] && this.splitQuery[3] === "add" && this.splitQuery[4] === "constraint") {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[2]);
      return [...this.dataTypes(), ...this.renderColumns(newCols)];
    } else if (this.splitQuery[2] && this.splitQuery[3] === "drop") {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[2]);
      return [...this.renderColumns(newCols), ...this.langkeyWords()];
    } else if (this.splitQuery[2] && this.splitQuery[3] === "alter") {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[2]);
      return [...this.renderColumns(newCols), ...this.langkeyWords(), ...this.dataTypes()];
    } else if (this.splitQuery[2] && this.splitQuery[3] === "modify") {
      let newCols = this.colsNames.filter((c) => c.tblName.toLowerCase() === this.splitQuery[2]);
      return [...this.renderColumns(newCols), ...this.langkeyWords(), ...this.dataTypes()];
    } else {
      return [...this.langkeyWords(), ...this.dataTypes(), ...this.operatores()];
    }
  }

  dropTable() {
    return this.renderTables();
  }
}

export default CQLCompletion;
