import Connections, { TableMeta } from "../../../services/Connections";
import { EditorLang } from "./DatabaseBrowser";
import {
  pgsqlFunction,
  pgsqlKeywords,
  pgsql_operators,
  pgsqlSnippet,
  completionInterface,
  pgsqlDataTypes,
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

const getFilterTableColsWithDot = (colsNames: Columns[], table: string): Columns[] => {
  const newCols = colsNames.filter((c) => c.tblName === table.slice(0, -1));
  return newCols ? newCols : [];
};
const getFilterTableCols = (colsNames: Columns[], table: string): Columns[] => {
  const newCols = colsNames.filter((c) => c.tblName === table);
  return newCols ? newCols : [];
};

export const getPgsqlCompletionProvider = (monaco: any, tablesMeta: TableMeta, editorLang: EditorLang, connectionId: number) => {
  // console.log(editorLang);
  let tblNames: Tables[] = [];
  let colsNames: Columns[] = [];
  Object.entries(tablesMeta).map(([tableName, value]) => {
    tblNames.push({ tblName: tableName, detail: `` });
    value.columns.map((col) => {
      colsNames.push({
        colName: col.name,
        detail: `Column in table ${tableName}: ${col.name} | ${col.dataType}`,
        tblName: tableName,
      });
    });
  });

  return monaco.languages.registerCompletionItemProvider(editorLang, {
    triggerCharacters: [".", '"'],
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
      try {
        let items: any[];
        if (splitQuery[0] === "select") {
          items = selectQuery(tblNames, colsNames, splitQuery, selectedLineContent, query, lastQueryWord, lastScndQryWord, monaco, range);
        } else if (splitQuery[0] === "create") {
          items = createQuery(tblNames, splitQuery, monaco, range);
        } else if (splitQuery[0] === "insert") {
          items = insertQuery(colsNames, tblNames, splitQuery, monaco, range);
        } else if (splitQuery[0] === "update") {
          items = updateQuery(tblNames, colsNames, splitQuery, monaco, range);
        } else if (splitQuery[0] === "delete" && splitQuery[1] === "from") {
          items = deleteQuery(tblNames, colsNames, splitQuery, monaco, range);
        } else if (splitQuery[0] === "alter") {
          items = alterTable(tblNames, colsNames, splitQuery, monaco, range);
        } else if (splitQuery[0] === "drop") {
          items = dropTable(tblNames, splitQuery, monaco, range);
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

export const selectQuery = (
  tblNames: Tables[],
  colsNames: Columns[],
  splitQuery: string[],
  selectedLineContent: string,
  query: string,
  lastQueryWord: string,
  lastScndQryWord: string,
  monaco: any,
  range: any
) => {
  console.log("select");
  if (selectedLineContent.includes("join")) {
    console.log("join");
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
    console.log("after", query.match(regexAfterJoin));
    console.log("before", query.match(regexBeforeJoin));
    console.log("var", query);

    if (query.match(regexAfterJoin)?.length) {
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
    } else if (query.match(regexBeforeJoin)?.length) {
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
    return items;
  } else if (!splitQuery[1] || lastQueryWord?.slice(-1) === ",") {
    return [
      {
        label: "*",
        kind: monaco.languages.CompletionItemKind.Field,
        detail: "Select all fields",
        range: range,
        insertText: "*",
      },
      ...renderCols(colsNames, monaco, range),
      ...renderTablesNames(tblNames, monaco, range),
    ];
  } else if (splitQuery[splitQuery.length - 1]) {
    return renderCols(getFilterTableColsWithDot(colsNames, splitQuery[splitQuery.length - 1]), monaco, range);
  } else if (lastQueryWord === "from") {
    return renderTablesNames(tblNames, monaco, range);
  } else {
    return [
      ...keyWords(pgsqlKeywords, monaco, range),
      ...dataTypes(pgsqlDataTypes, monaco, range),
      ...operatores(pgsql_operators, monaco, range),
    ];
  }
};

export const createQuery = (tblNames: Tables[], splitQuery: string[], monaco: any, range: any) => {
  if (splitQuery[1] === "table" && !splitQuery[2]) {
    return renderTablesNames(tblNames, monaco, range);
  } else {
    return [
      ...keyWords(pgsqlKeywords, monaco, range),
      ...dataTypes(pgsqlDataTypes, monaco, range),
      ...operatores(pgsql_operators, monaco, range),
    ];
  }
};

export const insertQuery = (colsNames: Columns[], tblNames: Tables[], splitQuery: string[], monaco: any, range: any) => {
  if (splitQuery[2] && splitQuery[3] === "(") {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[2]);
    return renderCols(newCols, monaco, range);
  } else if (splitQuery[3]?.includes(",")) {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[2]);
    return renderCols(newCols, monaco, range);
  } else if (splitQuery[1] === "into" && !splitQuery[2]) {
    return renderTablesNames(tblNames, monaco, range);
  }
};

export const updateQuery = (tblNames: Tables[], colsNames: Columns[], splitQuery: string[], monaco: any, range: any) => {
  if (!splitQuery[1]) {
    return renderTablesNames(tblNames, monaco, range);
  } else if (splitQuery[1] && splitQuery[2] === "set" && !splitQuery.includes("where")) {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[1]);
    return renderCols(newCols, monaco, range);
  } else if (splitQuery.includes("where")) {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[1]);
    return [...renderCols(newCols, monaco, range), ...operatores(pgsql_operators, monaco, range)];
  } else {
    return [
      ...keyWords(pgsqlKeywords, monaco, range),
      ...dataTypes(pgsqlDataTypes, monaco, range),
      ...operatores(pgsql_operators, monaco, range),
    ];
  }
};
export const deleteQuery = (tblNames: Tables[], colsNames: Columns[], splitQuery: string[], monaco: any, range: any) => {
  if (!splitQuery[2]) {
    return renderTablesNames(tblNames, monaco, range);
  } else if (splitQuery.includes("where")) {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[2]);
    return [...renderCols(newCols, monaco, range), ...operatores(pgsql_operators, monaco, range)];
  } else {
    return [
      ...keyWords(pgsqlKeywords, monaco, range),
      ...dataTypes(pgsqlDataTypes, monaco, range),
      ...operatores(pgsql_operators, monaco, range),
    ];
  }
};
export const alterTable = (tblNames: Tables[], colsNames: Columns[], splitQuery: string[], monaco: any, range: any) => {
  if (splitQuery[1] === "table" && !splitQuery[2]) {
    return renderTablesNames(tblNames, monaco, range);
  } else if (splitQuery[2] && splitQuery[3] === "add" && splitQuery[4] !== "constraint") {
    return [...dataTypes(pgsqlDataTypes, monaco, range)];
  } else if (splitQuery[2] && splitQuery[3] === "add" && splitQuery[4] === "constraint") {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[2]);
    return [...dataTypes(pgsqlDataTypes, monaco, range), ...renderCols(newCols, monaco, range)];
  } else if (splitQuery[2] && splitQuery[3] === "drop") {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[2]);
    return [...renderCols(newCols, monaco, range), ...keyWords(pgsqlKeywords, monaco, range)];
  } else if (splitQuery[2] && splitQuery[3] === "alter") {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[2]);
    return [...renderCols(newCols, monaco, range), ...keyWords(pgsqlKeywords, monaco, range), ...dataTypes(pgsqlDataTypes, monaco, range)];
  } else if (splitQuery[2] && splitQuery[3] === "modify") {
    let newCols = colsNames.filter((c) => c.tblName.toLowerCase() === splitQuery[2]);
    return [...renderCols(newCols, monaco, range), ...keyWords(pgsqlKeywords, monaco, range), ...dataTypes(pgsqlDataTypes, monaco, range)];
  } else {
    return [
      ...keyWords(pgsqlKeywords, monaco, range),
      ...dataTypes(pgsqlDataTypes, monaco, range),
      ...operatores(pgsql_operators, monaco, range),
    ];
  }
};

export const dropTable = (tblNames: Tables[], splitQuery: string[], monaco: any, range: any) => {
  return renderTablesNames(tblNames, monaco, range);
};

// +++++++++++ reusable functions +++++++++++++++++++++++++++++++++++++++++
export const defaultAutoCompletion = (
  pgsqlKeywords: completionInterface[],
  pgsql_operators: string[],
  pgsqlFunction: completionInterface[],
  monaco: any,
  range: any
) => {
  return [
    ...langSnippet(pgsqlSnippet, monaco, range),
    ...keyWords(pgsqlKeywords, monaco, range),
    ...operatores(pgsql_operators, monaco, range),
    ...langFunctions(pgsqlFunction, monaco, range),
    ...dataTypes(pgsqlDataTypes, monaco, range),
  ];
};

export const langSnippet = (snippet: completionInterface[], monaco: any, range: any) => {
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

export const dataTypes = (dataType: completionInterface[], monaco: any, range: any) => {
  return [
    ...dataType.map((d) => {
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
export const keyWords = (keyWords: completionInterface[], monaco: any, range: any) => {
  return [
    ...keyWords.map((k) => {
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

export const operatores = (operatores: string[], monaco: any, range: any) => {
  return [
    ...operatores.map((o) => {
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

export const langFunctions = (functions: completionInterface[], monaco: any, range: any) => {
  return [
    ...functions.map((f) => {
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
