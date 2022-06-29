import { MessageApi } from "antd/lib/message";
import { QueryExecutionResult } from "../../models/DatabaseBrowser";
import { Extractor } from "../../pages/workspace/DatabaseBrowser/DownloadModal";

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

export const createSQLInsert = (
  tableData: QueryExecutionResult,
  schema: string,
  tableName: string,
  tableDefinition: boolean,
  insertQuery: boolean = true
) => {
  let arrData = tableData.result;
  let colsData = tableData.columns;
  let keys = colsData.map((k) => k.name).join(",");
  let sql = "";
  let create_table = `CREATE TABLE ${tableName}(\r\n`;

  if (tableDefinition) {
    let row = "";
    for (let i = 0; i < colsData.length; i++) {
      row += `${colsData[i].name}  \t  ${colsData[i].dataType},\r\n`;
    }

    create_table += row + ");";
    sql += `${create_table} \r\n\r\n`;
  }

  //1st loop is to extract each row

  if (insertQuery) {
    arrData.map((d) => {
      let sql_insert = "INSERT INTO " + schema + "." + tableName;
      let keyName = ` (${keys}) `;
      sql_insert += keyName;
      let value: any[] = [];

      colsData.map((c) => {
        if (c.dataType === "int8" || c.dataType === "int16") {
          value.push(d[c.name]);
        } else {
          value.push(`'${d[c.name]}'`);
        }
      });
      let joinValue = value.join(",");

      sql_insert += `VALUES(${joinValue});\r\n`;
      sql += sql_insert;
    });
  }

  return sql;
};

export const createSQLUpdate = (tableData: QueryExecutionResult, schema: string, tableName: string, oldKey: string = undefined) => {
  let arrData = tableData.result;
  let colsData = tableData.columns;
  let sql = "";

  arrData.map((d) => {
    let sql_update = "UPDATE " + schema + "." + tableName + "\r\n" + "SET ";

    colsData.map((c) => {
      if (c.dataType === "int8" || c.dataType === "int16") {
        sql_update += `${c.name} = ${d[c.name]},`;
      } else {
        sql_update += ` ${c.name} = '${d[c.name]}',`;
      }
    });
    sql_update = sql_update.slice(0, -1);
    sql_update += `\r\nWHERE id = '${oldKey || d["id"]}';\r\n\r\n`;
    sql += sql_update;
  });
  return sql;
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

export const copyTextToClipboard = (text: string, message: MessageApi) => {
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
