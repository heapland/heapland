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

export const readCSVData = (data: string, showLabel: boolean, isRowHeader: boolean) => {
  let arrData = typeof data !== "object" ? JSON.parse(data) : data;

  let CSV = "";

  //This condition will generate the Label/Header
  if (showLabel) {
    var row = "";

    //This loop will extract the label from 1st index of on array
    for (var index in arrData[0]) {
      //Now convert each value to string and comma-seprated
      row += index + ",";
    }

    row = row.slice(0, -1);

    //append Label row with line break
    CSV += isRowHeader ? "#," + row + "\r\n" : row + "\r\n";
  }

  //1st loop is to extract each row
  for (var i = 0; i < arrData.length; i++) {
    var row = "";

    //2nd loop will extract each column and convert it in string comma-seprated
    for (var index in arrData[i]) {
      row += '"' + arrData[i][index] + '",';
    }

    row.slice(0, row.length - 1);

    //add a line break after each row
    CSV += isRowHeader ? i + 1 + "," + row + "\r\n" : row + "\r\n";
  }

  if (CSV === "") {
    alert("Invalid data");
    return;
  }

  return CSV;
};

export const readTSVData = (data: string, showLabel: boolean, isRowHeader: boolean) => {
  let arrData = typeof data !== "object" ? JSON.parse(data) : data;

  let TSV = "";

  //This condition will generate the Label/Header
  if (showLabel) {
    var row = "";

    //This loop will extract the label from 1st index of on array
    for (var index in arrData[0]) {
      //Now convert each value to string and comma-seprated
      row += index + "\t";
    }

    row = row.slice(0, -1);

    //append Label row with line break
    TSV += isRowHeader ? "#" + "\t" + row + "\r\n" : row + "\r\n";
  }

  //1st loop is to extract each row
  for (var i = 0; i < arrData.length; i++) {
    var row = "";

    //2nd loop will extract each column and convert it in string comma-seprated
    for (var index in arrData[i]) {
      row += arrData[i][index] + " \t";
    }

    row.slice(0, row.length - 1);

    //add a line break after each row
    TSV += isRowHeader ? i + 1 + "\t" + row + "\r\n" : row + "\r\n";
  }

  if (TSV === "") {
    alert("Invalid data");
    return;
  }

  return TSV;
};

export const readSQLInsert = (tableData: QueryExecutionResult, schema: string, tableName: string, tableDefinition: boolean) => {
  let arrData = tableData.result;
  let colsData = tableData.columns;
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
  for (let i = 0; i < arrData.length; i++) {
    let sql_insert = "INSERT INTO " + schema + "." + tableName;
    let value = "";

    var names = "(";
    //This loop will extract the label from 1st index of on array
    for (let index in arrData[0]) {
      //Now convert each value to string and comma-seprated
      names += index + ",";
    }
    names = names.slice(0, -1);

    //append Label row with line break
    sql_insert += names + ",";
    //2nd loop will extract each column and convert it in string comma-seprated
    for (let index in arrData[i]) {
      value += '"' + arrData[i][index] + '",';
    }

    value.slice(0, value.length - 1);
    //add a line break after each row
    sql_insert += value + ");\r\n";
    sql += sql_insert;
  }

  return sql;
};

export const readSQLUpdate = (data: any[], schema: string, tableName: string) => {
  let arrData = typeof data !== "object" ? JSON.parse(data) : data;
  let sql = "";

  //1st loop is to extract each row
  for (let i = 0; i < arrData.length; i++) {
    let sql_update = "UPDATE  " + schema + "." + tableName;
    let names = " SET ";

    for (let label in arrData[0]) {
      names += label + " = ";
      names += '"' + arrData[i][label] + '", ';
    }
    names = names.slice(0, -1);

    sql_update += names + "\r\n";
    sql += sql_update;
  }

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
