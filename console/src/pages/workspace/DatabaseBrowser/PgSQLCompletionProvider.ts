import { table } from "console";
import Connections from "../../../services/Connections";
import { EditorLang } from "./DatabaseBrowser";
import { sqlFunction, sqlKeywords, operators } from "./PgSQL";

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
    triggerCharacters: [".", '"', " "],
    provideCompletionItems: (model: any, position: any, context: any) => {
      const word = model.getWordUntilPosition(position);

      const range = getRange(word, position);
      const prvRange = getPrvRange(word, position);
      const query = model.getValueInRange(prvRange);
      const splitQuery = query.split(" ");
      const lastQueryWord = splitQuery[splitQuery.length - 2]?.toLowerCase();
      const lastScndQryWord = splitQuery[splitQuery.length - 3]?.toLowerCase();
      // console.log(query);
      // console.log("last 2nd ", lastScndQryWord);
      // console.log("last ", lastQueryWord);

      try {
        let items: any[];
        if (lastQueryWord === "select" || lastQueryWord === "where" || lastQueryWord?.slice(-1) === ",") {
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
          lastQueryWord === "detailribe" ||
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
        } else if (lastQueryWord === "set" || (lastQueryWord === "where" && tblNames.find((t) => t.tblName === lastScndQryWord))) {
          items = [
            ...colsNames.map((c) => {
              if (c.tblName === lastScndQryWord) {
                return {
                  label: c.colName,
                  kind: monaco.languages.CompletionItemKind.Value,
                  detail: c.detail,
                  range: range,
                  insertText: c.colName,
                };
              } else {
                return {
                  label: "",
                  kind: monaco.languages.CompletionItemKind.Value,
                  detail: "",
                  range: range,
                  insertText: "",
                };
              }
            }),
          ];
        } else {
          items = [
            ...sqlKeywords.map((k) => {
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
          ];
        }
        //   console.log(items);
        return { suggestions: items };
      } catch (_) {
        // any error, returns empty suggestion
        return { suggestions: [] };
      }
    },
  });
};
