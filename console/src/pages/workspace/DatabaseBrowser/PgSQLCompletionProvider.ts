import { EditorLang } from "./DatabaseBrowser";
import AutoCompletion, { langSnippet } from "../../../components/AutoCompletion/AutoCompletion";

export interface Tables {
  tblName: string;
  detail: string;
  insertText: string;
}
export interface Columns {
  colName: string;
  detail: string;
  tblName: string;
}
export interface AutocompleteData {
  tables: Tables[];
  columns: Columns[];
}

const getRange = (word: any, position: any) => {
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
};
const getPrvRange = (word: any, position: any) => {
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn - word.startColumn,
    endColumn: word.startColumn,
  };
};

export const getFilterTableColsWithDot = (colsNames: Columns[], table: string): Columns[] => {
  const newCols = colsNames.filter((c) => c.tblName === table.slice(0, -1));
  return newCols ? newCols : [];
};
export const getFilterTableCols = (colsNames: Columns[], table: string): Columns[] => {
  const newCols = colsNames.filter((c) => c.tblName === table);
  return newCols ? newCols : [];
};

export const getPgsqlCompletionProvider = (monaco: any, tblNames: Tables[], colsNames: Columns[], editorLang: EditorLang) => {
  // console.log(editorLang);
  return monaco.languages.registerCompletionItemProvider(editorLang, {
    triggerCharacters: ["."],
    provideCompletionItems: (model: any, position: any, context: any) => {
      const word = model.getWordUntilPosition(position);

      const range = getRange(word, position);
      const prvRange = getPrvRange(word, position);
      const query = model.getValueInRange(prvRange);
      const selectedLineContent = model.getLineContent(position.lineNumber).trim();

      const splitQuery = query.split(" ").map((q: string) => q?.toLowerCase());
      const lastQueryWord = splitQuery[splitQuery.length - 2]?.toLowerCase();
      const lastScndQryWord = splitQuery[splitQuery.length - 3]?.toLowerCase();

      // console.log("selectedQuery", selectedLineContent);
      // console.log("query", splitQuery);
      // console.log(lastScndQryWord, lastQueryWord);

      const newAutoComp = new AutoCompletion(editorLang, tblNames, colsNames, splitQuery, monaco, range);
      try {
        let items: any[];
        const autoComp = newAutoComp.queryMethod();
        if (splitQuery[0] === "select") {
          items = autoComp.selectQuery(selectedLineContent, query, lastQueryWord, lastScndQryWord);
        } else if (splitQuery[0] === "create") {
          items = autoComp.createQuery();
        } else if (splitQuery[0] === "insert") {
          items = autoComp.insertQuery();
        } else if (splitQuery[0] === "update") {
          items = autoComp.updateQuery();
        } else if (splitQuery[0] === "delete" && splitQuery[1] === "from") {
          items = autoComp.deleteQuery(lastQueryWord);
        } else if (splitQuery[0] === "alter") {
          items = autoComp.alterTable();
        } else if (splitQuery[0] === "drop") {
          items = autoComp.dropTable();
        } else if (splitQuery[0] === "keyspace") {
          items = newAutoComp.defaultAutoCompletion();
        } else if (range.startColumn === 1 && range.endColumn === 1) {
          items = langSnippet(editorLang, monaco, range);
        } else {
          items = newAutoComp.defaultAutoCompletion();
        }
        // console.log("item ", items);
        return { suggestions: items };
      } catch (_) {
        // any error, returns empty suggestion
        return { suggestions: [] };
      }
    },
  });
};
