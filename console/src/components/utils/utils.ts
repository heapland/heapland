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

export const readCSVData = (data: string, showLabel: boolean, serialId: boolean) => {
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
    CSV += serialId ? "#," + row + "\r\n" : row + "\r\n";
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
    CSV += serialId ? i + 1 + "," + row + "\r\n" : row + "\r\n";
  }

  if (CSV === "") {
    alert("Invalid data");
    return;
  }

  return CSV;
};

export const readTSVData = (data: string, showLabel: boolean, serialId: boolean) => {
  let arrData = typeof data !== "object" ? JSON.parse(data) : data;

  let CSV = "";

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
    CSV += serialId ? "# " + row + "\r\n" : row + "\r\n";
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
    CSV += serialId ? i + 1 + " " + row + "\r\n" : row + "\r\n";
  }

  if (CSV === "") {
    alert("Invalid data");
    return;
  }

  return CSV;
};

export const readSQLInsert = (data: any[], schema: string, tableName: string) => {
  let arrData = typeof data !== "object" ? JSON.parse(data) : data;
  let sql = "";

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
    sql_insert += value + ")\r\n";
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

    //This loop will extract the label from 1st index of on array
    for (let id in arrData[0]) {
      //Now convert each value to string and comma-seprated
      names += id + " = ";
      names += '"' + arrData[i][id] + '", ';
    }
    names = names.slice(0, -1);

    sql_update += names + "\r\n";
    sql += sql_update;
  }

  return sql;
};
