import { table } from "console";
import Connections from "../../../services/Connections";
import { EditorLang } from "./DatabaseBrowser";
import { pgsqlFunction, pgsqlKeywords, operators } from "./PgSQL";

interface Tables {
  tblName: string;
  detail: string;
}
interface Columns {
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

const checkIfTablePres = (tblNames: Tables[], splitQuery: string[]) => {
  return tblNames.find((t) => splitQuery.includes(t.tblName)) as Tables;
};

export const getPgsqlCompletionProvider = (monaco: any, editorLang: EditorLang, connectionId: number) => {
  let tblNames: Tables[] = [];
  let colsNames: Columns[] = [];

  Connections.listSchemas(connectionId, (schemas) => {
    if (schemas.length > 0) {
      schemas.map((schema) => {
        Connections.listTables(connectionId, schema, (tables) => {
          tables.map((table) => {
            tblNames.push({ tblName: table, detail: `Table in Schema: ${schema}` });
            Connections.listTablesObjects(connectionId, schema, table, (objs) => {
              objs?.columns?.map((col) => {
                colsNames.push({ colName: col.name, detail: `Column in table ${table}: ${col.name} | ${col.dataType}`, tblName: table });
              });
            });
          });
        });
      });
    }
  });
  return monaco.languages.registerCompletionItemProvider(editorLang, {
    triggerCharacters: [".", '"', "(", ","],
    provideCompletionItems: (model: any, position: any, context: any) => {
      const word = model.getWordUntilPosition(position);

      const range = getRange(word, position);
      const prvRange = getPrvRange(word, position);
      const query = model.getValueInRange(prvRange);
      const splitQuery = query.split(" ").map((q: string) => q?.toLowerCase());
      const lastQueryWord = splitQuery[splitQuery.length - 2]?.toLowerCase();
      const lastScndQryWord = splitQuery[splitQuery.length - 3]?.toLowerCase();
      // console.log(query, word, splitQuery);
      // console.log("last 2nd ", lastScndQryWord);
      // console.log("last ", lastQueryWord);

      try {
        let items: any[];
        if (lastQueryWord === "select" || lastQueryWord?.slice(-1) === ",") {
          items = [
            {
              label: "*",
              kind: monaco.languages.CompletionItemKind.Field,
              detail: "Select all fields",
              range: range,
              insertText: "*",
            },
            ...colsNames.map((c) => {
              return {
                label: c.colName,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: c.detail,
                range: range,
                insertText: c.colName,
              };
            }),
          ];
        } else if (
          lastQueryWord === "from" ||
          lastQueryWord === "describe" ||
          lastQueryWord === "table" ||
          lastQueryWord === "into" ||
          lastQueryWord === "update"
        ) {
          items = [
            ...tblNames.map((t) => {
              return {
                label: t.tblName,
                kind: monaco.languages.CompletionItemKind.Field,
                range: range,
                detail: t.detail,
                insertText: t.tblName,
              };
            }),
          ];
        } else if (splitQuery.includes("set") || (lastQueryWord === "where" && !!checkIfTablePres(tblNames, splitQuery))) {
          let newCols = colsNames.filter(
            (c) => c.tblName === lastScndQryWord || c.tblName === checkIfTablePres(tblNames, splitQuery).tblName
          );
          items = [
            ...newCols.map((c) => {
              return {
                label: c.colName,
                kind: monaco.languages.CompletionItemKind.Value,
                detail: c.detail,
                range: range,
                insertText: c.colName,
              };
            }),
          ];
        } else if (splitQuery.includes("insert") && splitQuery.includes("into") && !!checkIfTablePres(tblNames, splitQuery)) {
          let newCols = colsNames.filter((c) => c.tblName === lastQueryWord);
          items = [
            ...newCols.map((c) => {
              return {
                label: c.colName,
                kind: monaco.languages.CompletionItemKind.Value,
                detail: c.detail,
                range: range,
                insertText: c.colName,
              };
            }),
          ];
        } else {
          items = [
            ...pgsqlKeywords.map((k) => {
              return {
                label: k.key,
                kind: monaco.languages.CompletionItemKind.Keyword,
                detail: k.detail,
                range: range,
                insertText: k.key,
              };
            }),
            ...operators.map((o) => {
              return {
                label: o,
                kind: monaco.languages.CompletionItemKind.Operator,
                detail: o,
                range: range,
                insertText: o,
              };
            }),
            ...pgsqlFunction.map((f) => {
              return {
                label: f.key,
                kind: monaco.languages.CompletionItemKind.Operator,
                detail: f.detail,
                range: range,
                insertText: f.insertText,
              };
            }),
          ];
        }
        // console.log(items);
        return { suggestions: items };
      } catch (_) {
        // any error, returns empty suggestion
        return { suggestions: [] };
      }
    },
  });
};