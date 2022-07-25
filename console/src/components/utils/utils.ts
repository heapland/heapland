import { useState, useEffect } from "react";
import message, { MessageApi } from "antd/lib/message";
import { QueryExecutionResult } from "../../models/DatabaseBrowser";
import { EditorLang } from "../../pages/workspace/DatabaseBrowser/DatabaseBrowser";
import { Extractor } from "../../pages/workspace/DatabaseBrowser/DownloadModal";
import { pgsql_operators, pgsql_builtinVariables, pgsql_typeKeywords, pgsqlFunction, pgsqlKeywords } from "../DatabasesKeywords/PgSQL";
import { cql_operators, cql_builtinVariables, cql_typeKeywords, cqlFunction, cqlKeywords } from "../DatabasesKeywords/CQL";
import { PrimaryKey, TableMeta } from "../../services/Connections";

export const truncateString = (str: string, num: number) => {
  if (str.length > num) {
    return str.slice(0, num) + "...";
  } else {
    return str;
  }
};

export const donwloadFile = async (data: string, name: string, extractor: Extractor) => {
  let type = "";
  let fileName = "";
  if (extractor === "json") {
    type = "application/json";
    fileName = name + ".json";
  } else if (extractor === "sql_insert") {
    type = "text/sql;charset=utf-8";
    fileName = name + "_insert" + ".sql";
  } else if (extractor === "sql_update") {
    type = "text/sql;charset=utf-8";
    fileName = name + "_update" + ".sql";
  } else if (extractor === "csv") {
    type = "text/csv;charset=utf-8";
    fileName = name + ".csv";
  } else if (extractor === "tsv") {
    type = "text/tsv;charset=utf-8";
    fileName = name + ".tsv";
  }
  const blob = new Blob([data], { type: type });
  const href = await URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const readCSVData = (tableData: QueryExecutionResult, showLabel: boolean, isRowHeader: boolean) => {
  let arrData = tableData.result;
  let colsData = tableData.columns;
  let keys = colsData.map((k) => k.name).join(",");
  let CSV = "";

  if (showLabel) {
    let rowKey = keys;
    CSV += isRowHeader ? "#," + rowKey + "\r\n" : rowKey + "\r\n";
  }

  arrData.map((d, i) => {
    let rowValue: any[] = [];
    colsData.map((c) => {
      rowValue.push(d[c.name]);
    });
    let joinValue = rowValue.join(",");
    CSV += isRowHeader ? i + 1 + "," + joinValue + "\r\n" : joinValue + "\r\n";
  });

  if (CSV === "") {
    alert("Invalid data");
    return;
  }

  return CSV;
};

export const readTSVData = (tableData: QueryExecutionResult, showLabel: boolean, isRowHeader: boolean) => {
  let arrData = tableData.result;
  let colsData = tableData.columns;
  let keys = colsData.map((k) => k.name).join("\t");

  let TSV = "";

  //This condition will generate the Label/Header
  if (showLabel) {
    let rowKey = keys;
    TSV += isRowHeader ? "#" + "\t" + rowKey + "\r\n" : rowKey + "\r\n";
  }

  arrData.map((d, i) => {
    let rowValue: any[] = [];
    colsData.map((c) => {
      rowValue.push(d[c.name]);
    });
    let joinValue = rowValue.join("\t");
    TSV += isRowHeader ? i + 1 + "\t" + joinValue + "\r\n" : joinValue + "\r\n";
  });

  if (TSV === "") {
    alert("Invalid data");
    return;
  }

  return TSV;
};

const fallbackCopyTextToClipboard = (text: string, message: MessageApi) => {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand("copy");
    var msg = successful ? "successful" : "unsuccessful";
    console.log("Fallback: Copying text command was " + msg);
    message.success("Copying text command was " + msg);
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
  }

  document.body.removeChild(textArea);
};

export const copyTextToClipboard = (text: string) => {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text, message);
    return;
  }
  navigator.clipboard.writeText(text).then(
    function () {
      console.log("Async: Copying to clipboard was successful!");
      message.success("Copying to clipboard was successful!");
    },
    function (err) {
      console.error("Async: Could not copy text: ", err);
      message.error("Could not copy text");
    }
  );
};

export const getLangDefinition = (editorLang: EditorLang) => {
  let keywords: string[] = [];
  let typeKeywords: string[] = [];
  let operators: string[] = [];
  switch (editorLang) {
    case "pgsql":
    case "mysql":
      keywords = [...pgsqlKeywords.map((k) => k.key), ...pgsqlFunction.map((f) => f.key)];
      operators = [...pgsql_operators];
      typeKeywords = [...pgsql_typeKeywords, ...pgsql_builtinVariables];
      break;
    case "cql":
      keywords = [...cqlKeywords.map((k) => k.key), ...cqlFunction.map((f) => f.key)];
      operators = [...cql_operators];
      typeKeywords = [...cql_typeKeywords, ...cql_builtinVariables];
      break;
    default:
      break;
  }

  return {
    ignoreCase: true,
    keywords: keywords,
    typeKeywords: typeKeywords,
    operators: [
      ...operators,
      "=",
      ">",
      "<",
      "!",
      "~",
      "?",
      ":",
      "==",
      "<=",
      ">=",
      "!=",
      "&&",
      "||",
      "++",
      "--",
      "+",
      "-",
      "*",
      "/",
      "&",
      "|",
      "^",
      "%",
      "<<",
      ">>",
      ">>>",
      "+=",
      "-=",
      "*=",
      "/=",
      "&=",
      "|=",
      "^=",
      "%=",
      "<<=",
      ">>=",
      ">>>=",
    ],

    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*\/^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // identifiers and keywords
        { include: "custom" },
        [
          /[a-z_$][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@typeKeywords": "keyword",
              "@default": "identifier",
            },
          },
        ],
        [/[A-Z][\w$]*/, "type.identifier"], // to show class names nicely

        // whitespace
        { include: "@whitespace" },

        // delimiters and operators
        [/[{}()\[\]]/, "@brackets"],
        [/[<>](?!@symbols)/, "@brackets"],
        [
          /@symbols/,
          {
            cases: {
              "@operators": "operator",
              "@default": "",
            },
          },
        ],

        // numbers
        [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, "number.float"],
        [/0[xX][0-9a-fA-F_]*[0-9a-fA-F][Ll]?/, "number.hex"],
        [/0[0-7_]*[0-7][Ll]?/, "number.octal"],
        [/0[bB][0-1_]*[0-1][Ll]?/, "number.binary"],
        [/\d+[lL]?/, "number"],

        // delimiter: after number because of .\d floats
        [/[;,.]/, "delimiter"],

        // strings
        [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
        [/"/, "string", "@string"],

        // characters
        [/'[^\\']'/, "string"],
        [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
        [/'/, "string.invalid"],
      ],

      custom: [
        ["someSampleWord", "customClass"],
        ["Array", "redClass"],
      ],

      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\/\*/, "comment", "@comment"],
        [/\/\+/, "comment", "@comment"],
        [/\/\/.*$/, "comment"],
      ],

      comment: [
        [/[^\/*]+/, "comment"],
        [/\/\+/, "comment", "@push"],
        [/\/\*/, "comment.invalid"],
        ["\\*/", "comment", "@pop"],
        ["\\+/", "comment", "@pop"],
        [/[\/*]/, "comment"],
      ],

      string: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/"/, "string", "@pop"],
      ],
    },
  };
};

export const useWindowDimensions = () => {
  const hasWindow = typeof window !== "undefined";

  function getWindowDimensions() {
    const width = hasWindow ? window.innerWidth : null;
    const height = hasWindow ? window.innerHeight : null;
    return {
      width,
      height,
    };
  }

  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    if (hasWindow) {
      const handleResize = () => {
        setWindowDimensions(getWindowDimensions());
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [hasWindow]);

  return windowDimensions;
};

export const isNumberDataType = (dataType: string) => {
  return [
    "serial",
    "bigserial",
    "bigint",
    "int8",
    "int",
    "int4",
    "smallint",
    "integer",
    "decimal",
    "numeric",
    "real",
    "double precision",
    "smallserial",
  ].includes(dataType?.toLowerCase());
};

export const extractPkeyfromTable = (allTables: TableMeta, tblName: string): PrimaryKey[] => {
  let pkeys: PrimaryKey[] = [];
  Object.entries(allTables).map(([tableName, value]) => {
    if (tableName === tblName) {
      pkeys = value?.primaryKeys ? value.primaryKeys : [];
    }
  });

  return pkeys;
};
