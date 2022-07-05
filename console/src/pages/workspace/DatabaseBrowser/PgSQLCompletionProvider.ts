import { table } from "console";
import Connections from "../../../services/Connections";
import { EditorLang } from "./DatabaseBrowser";
import {
  pgsqlFunction,
  pgsqlKeywords,
  pgsql_operators,
  pgsqlSnippet,
  LangSnippet,
  PGSQLFunction,
  PGSQLKeywords,
} from "../../../components/DatabasesKeywords/PgSQL";

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
  return tblNames.find((t) => splitQuery.includes(t.tblName));
};

const getFilterTableColsWithDot = (colsNames: Columns[], table: string): Columns[] => {
  const newCols = colsNames.filter((c) => c.tblName === table.slice(0, -1));
  return newCols ? newCols : [];
};
const getFilterTableCols = (colsNames: Columns[], table: string): Columns[] => {
  const newCols = colsNames.filter((c) => c.tblName === table);
  return newCols ? newCols : [];
};

export const getPgsqlCompletionProvider = (monaco: any, editorLang: EditorLang, connectionId: number) => {
  let tblNames: Tables[] = [];
  let colsNames: Columns[] = [];
  if (editorLang === "mysql") {
    Connections.listTables(connectionId, "default", editorLang, (tables) => {
      tables.map((table) => {
        tblNames.push({ tblName: table, detail: `Table in Database:` });
        Connections.listTablesObjects(connectionId, "default", table, (objs) => {
          objs?.columns?.map((col) => {
            colsNames.push({ colName: col.name, detail: `Column in table ${table}: ${col.name} | ${col.dataType}`, tblName: table });
          });
        });
      });
    });
  } else {
    Connections.listSchemas(connectionId, (schemas) => {
      if (schemas.length > 0) {
        schemas.map((schema) => {
          Connections.listTables(connectionId, schema, editorLang, (tables) => {
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
  }
  return monaco.languages.registerCompletionItemProvider(editorLang, {
    triggerCharacters: [".", '"', "(", ","],
    provideCompletionItems: (model: any, position: any, context: any) => {
      const word = model.getWordUntilPosition(position);

      const range = getRange(word, position);
      const prvRange = getPrvRange(word, position);
      const query = model.getValueInRange(prvRange);
      const lineContent = model.getLineContent(position.lineNumber).trim();

      const splitQuery = query.split(" ").map((q: string) => q?.toLowerCase());
      const secondQryWord = splitQuery[splitQuery.length - 1]?.toLowerCase();
      const lastQueryWord = splitQuery[splitQuery.length - 2]?.toLowerCase();
      const lastScndQryWord = splitQuery[splitQuery.length - 3]?.toLowerCase();

      let beforeJoinVarArr;
      let afterJoinVarArr;
      let regexAfter;
      let regexBefore;

      // join variable
      if (lineContent?.includes("join")) {
        beforeJoinVarArr = lineContent
          .trim()
          .match(/(?<=from\s).*(?=\sjoin)/gi)[0]
          .replace("'", "")
          .split(" ");
        afterJoinVarArr = lineContent
          .trim()
          .match(/(?<=join\s).*(?=\son)/gi)[0]
          .replace("'", "")
          .split(" ");

        regexBefore = new RegExp(beforeJoinVarArr[1], "g");
        regexAfter = new RegExp(afterJoinVarArr[1], "g");
      }

      console.log("lastword", lastQueryWord);
      console.log("last2ndword", lastScndQryWord);
      // console.log("query", query, splitQuery, word);
      // console.log("regex", query.match(regexAfter));
      // console.log("regex", query.match(regexBefore), lineContent?.includes("join"));

      console.log(splitQuery, query);
      try {
        let items: any[];
        if (lineContent?.includes("join") && (query.match(regexAfter)?.length || query.match(regexBefore)?.length)) {
          if (query.match(regexAfter)?.length) {
            items = [
              ...getFilterTableCols(colsNames, afterJoinVarArr[0]).map((c) => {
                return {
                  label: c.colName,
                  kind: monaco.languages.CompletionItemKind.Value,
                  detail: c.detail,
                  range: range,
                  insertText: c.colName,
                };
              }),
            ];
          } else if (query.match(regexBefore)?.length) {
            items = [
              ...getFilterTableCols(colsNames, beforeJoinVarArr[0]).map((c) => {
                return {
                  label: c.colName,
                  kind: monaco.languages.CompletionItemKind.Value,
                  detail: c.detail,
                  range: range,
                  insertText: c.colName,
                };
              }),
            ];
          }
        } else if (splitQuery[splitQuery.length - 1]) {
          items = [
            ...getFilterTableColsWithDot(colsNames, splitQuery[splitQuery.length - 1]).map((c) => {
              return {
                label: c.colName,
                kind: monaco.languages.CompletionItemKind.Value,
                detail: c.detail,
                range: range,
                insertText: c.colName,
              };
            }),
          ];
        } else if (lastQueryWord === "select" || lastQueryWord?.slice(-1) === ",") {
          items = selectQuery(colsNames, tblNames, monaco, range);
        } else if (
          lastQueryWord === "from" ||
          lastQueryWord === "describe" ||
          lastQueryWord === "table" ||
          lastQueryWord === "join" ||
          lastQueryWord === "update"
        ) {
          items = renderTablesNames(tblNames, monaco, range);
        } else if (splitQuery.includes("set") || (lastQueryWord === "where" && !!checkIfTablePres(tblNames, splitQuery))) {
          let newCols = colsNames.filter(
            (c) => c.tblName === lastScndQryWord || c.tblName === checkIfTablePres(tblNames, splitQuery).tblName
          );
          items = renderCols(newCols, monaco, range);
        } else if (splitQuery.includes("insert") && splitQuery.includes("into")) {
          let newCols = colsNames.filter((c) => c.tblName === lastQueryWord);
          items = insertQuery(newCols, tblNames, splitQuery, monaco, range);
        } else if (range.startColumn === 1 && range.endColumn === 1) {
          items = langSnippet(pgsqlSnippet, monaco, range);
        } else {
          items = defaultAutoCompletion(pgsqlKeywords, pgsql_operators, pgsqlFunction, monaco, range);
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

export const renderTablesNames = (tblNames: Tables[], monaco: any, range: any) => {
  return [
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
};

export const renderCols = (colsNames: Columns[], monaco: any, range: any) => {
  return [
    ...colsNames.map((c) => {
      return {
        label: c.colName,
        kind: monaco.languages.CompletionItemKind.Value,
        detail: c.detail,
        range: range,
        insertText: c.colName,
      };
    }),
  ];
};

export const selectQuery = (colsNames: Columns[], tblNames: Tables[], monaco: any, range: any) => {
  return [
    {
      label: "*",
      kind: monaco.languages.CompletionItemKind.Field,
      detail: "Select all fields",
      range: range,
      insertText: "*",
    },
    ...renderCols(colsNames, monaco, range),
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
};

export const insertQuery = (newCols: Columns[], tblNames: Tables[], splitQuery: string[], monaco: any, range: any) => {
  if (!!checkIfTablePres(tblNames, splitQuery)) {
    return [
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
    return [
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
  }
};

export const langSnippet = (snippet: LangSnippet[], monaco: any, range: any) => {
  return [
    ...snippet.map((d) => {
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

const defaultAutoCompletion = (
  pgsqlKeywords: PGSQLKeywords[],
  pgsql_operators: string[],
  pgsqlFunction: PGSQLFunction[],
  monaco: any,
  range: any
) => {
  return [
    ...pgsqlSnippet.map((d) => {
      return {
        label: d.key,
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: d.detail,
        range: range,
        insertText: d.insertText,
      };
    }),
    ...pgsqlKeywords.map((k) => {
      return {
        label: k.key,
        kind: monaco.languages.CompletionItemKind.Keyword,
        detail: k.detail,
        range: range,
        insertText: k.key,
      };
    }),
    ...pgsql_operators.map((o) => {
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
};
