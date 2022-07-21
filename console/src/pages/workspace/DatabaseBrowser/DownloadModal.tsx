import React, { FC, useState, useEffect } from "react";
import Editor, { Monaco, useMonaco } from "@monaco-editor/react";
import { QueryExecutionResult } from "../../../models/DatabaseBrowser";
import { Button, Input, Modal, Select, Space, Checkbox, message } from "antd";
import { SwitcherTwoTone } from "@ant-design/icons";
import { Controlled as Codemirror } from "react-codemirror2";
import { readCSVData, readTSVData, donwloadFile, copyTextToClipboard } from "../../../components/utils/utils";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import { PrimaryKey } from "../../../services/Connections";
import DBOperations from "../../../components/DBOperation/DBOperation";
import { EditorLang } from "./DatabaseBrowser";
const { Option } = Select;

export type Extractor = "sql_insert" | "csv" | "tsv" | "json" | "sql_update";

const editorOptions = {
  mode: "shell",
  theme: "material",
  lineNumbers: true,
};

const getExtracterOpt = (dbLang: EditorLang) => {
  switch (dbLang) {
    case "pgsql":
      return [
        {
          label: "PGSQL Insert",
          value: "sql_insert",
        },
        {
          label: "PGSQL Update",
          value: "sql_update",
        },
      ];
    case "cql":
      return [
        {
          label: "CQL Insert",
          value: "sql_insert",
        },
        {
          label: "CQL Update",
          value: "sql_update",
        },
      ];
    case "mysql":
      return [
        {
          label: "MySQL Insert",
          value: "sql_insert",
        },
        {
          label: "MySQL Update",
          value: "sql_update",
        },
      ];
  }
};

interface DownloadInfo {
  extractor: Extractor;
  editorLang: string;
  downContent: any;
  isColumnHeader: boolean;
  isRowHeader: boolean;
  isTableDefinition: boolean;
}

const DownloadModal: FC<{
  isDownloadModal: boolean;
  closeDownloadModal: () => void;
  schema: string;
  tableName: string;
  connectionId: number;
  dbName: string;
  tableData: QueryExecutionResult;
  dbOps: DBOperations;
  dbLang: EditorLang;
}> = ({ isDownloadModal, closeDownloadModal, schema, tableName, dbName, tableData, dbOps, dbLang }) => {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>({
    extractor: "sql_insert",
    editorLang: "sql",
    downContent: "",
    isColumnHeader: false,
    isRowHeader: false,
    isTableDefinition: false,
  });

  const onChangeExtractor = (value: Extractor) => {
    if (value === "sql_insert") {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: "sql",
        downContent: dbOps.method(tableData.result, tableData.columns).createInsertQry(),
        isTableDefinition: false,
      });
    } else if (value === "sql_update") {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: "sql",
        downContent: dbOps.method(tableData.result, tableData.columns).createUpdateQry(null),
      });
    } else if (value === "json") {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: "json",
        downContent: JSON.stringify(tableData?.result, null, 2),
      });
    } else if (value === "csv") {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: "csv",
        downContent: readCSVData(tableData, false, false),
        isColumnHeader: false,
        isRowHeader: false,
      });
    } else if (value === "tsv") {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: value,
        downContent: readTSVData(tableData, false, false),
        isColumnHeader: false,
        isRowHeader: false,
      });
    }
  };
  const onDownloadData = async () => {
    donwloadFile(downloadInfo.downContent, tableName, downloadInfo.extractor);
  };
  useEffect(() => {
    if (tableData && tableName && schema) {
      setDownloadInfo({
        ...downloadInfo,
        extractor: "sql_insert",
        editorLang: "sql",
        downContent: dbOps.method(tableData.result, tableData.columns).createInsertQry(),
        isTableDefinition: false,
      });
    }
  }, []);

  const onShowColumnRow = (e: CheckboxChangeEvent) => {
    const checked = e.target.checked;
    const name = e.target.name;
    if (name === "column") {
      setDownloadInfo({
        ...downloadInfo,
        isColumnHeader: checked,
        downContent:
          downloadInfo.extractor === "csv"
            ? readCSVData(tableData, checked, downloadInfo.isRowHeader)
            : readTSVData(tableData, checked, downloadInfo.isRowHeader),
      });
    } else if (name === "row") {
      setDownloadInfo({
        ...downloadInfo,
        isRowHeader: checked,
        downContent:
          downloadInfo.extractor === "csv"
            ? readCSVData(tableData, downloadInfo.isColumnHeader, checked)
            : readTSVData(tableData, downloadInfo.isColumnHeader, checked),
      });
    } else if (name === "table_definition") {
      setDownloadInfo({
        ...downloadInfo,
        isTableDefinition: checked,
        downContent: dbOps.method(tableData.result, tableData.columns).createInsertQry(true, checked),
      });
    }
  };
  return (
    <Modal
      width={1000}
      bodyStyle={{ height: 500 }}
      centered
      className='download-modal-wrapper'
      title='Export Data'
      visible={isDownloadModal}
      footer={
        <Space>
          <Button onClick={closeDownloadModal} className='cancel-modal-btn'>
            Cancel
          </Button>
          <Button className='copy-text-btn' onClick={() => copyTextToClipboard(downloadInfo.downContent)}>
            Copy to Clipboard
          </Button>
          <Button type='primary' onClick={onDownloadData}>
            Export to file
          </Button>
        </Space>
      }
      onCancel={closeDownloadModal}>
      <div className='download-content-wrapper'>
        <Space size='middle' direction='vertical' className='form-container'>
          <div className='form-group'>
            <div className='input-label'>Source:</div>
            <Input placeholder={dbName + "." + schema + "." + tableName} disabled />
          </div>
          <div className='form-group'>
            <div className='input-label'>Extractor:</div>
            <Select
              style={{ width: "100%" }}
              showSearch
              placeholder='Select an Extractor'
              optionFilterProp='children'
              value={downloadInfo.extractor}
              defaultValue={downloadInfo.extractor}
              onChange={onChangeExtractor}
              filterOption={(input: any, option: any) =>
                (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())
              }>
              {getExtracterOpt(dbLang).map((o, i) => {
                return (
                  <Option key={i} value={o.value}>
                    {o.label}
                  </Option>
                );
              })}
              <Option value='csv'>CSV</Option>
              <Option value='tsv'>TSV</Option>
              <Option value='json'>JSON</Option>
            </Select>
          </div>
          {downloadInfo.extractor === "sql_insert" && (
            <div className='form-group'>
              <Checkbox name='table_definition' onChange={onShowColumnRow}>
                Add table definition (DDL)
              </Checkbox>
            </div>
          )}
          {(downloadInfo.extractor === "csv" || downloadInfo.extractor === "tsv") && (
            <>
              <div className='form-group'>
                <Checkbox name='column' checked={downloadInfo.isColumnHeader} onChange={onShowColumnRow}>
                  Add column header
                </Checkbox>
              </div>
              <div className='form-group'>
                <Checkbox name='row' checked={downloadInfo.isRowHeader} onChange={onShowColumnRow}>
                  Add row header
                </Checkbox>
              </div>
            </>
          )}
        </Space>
        <div className='preview-container'>
          <div className='preview-title'>Export Preview:</div>
          {downloadInfo.downContent && (
            <Codemirror
              className=''
              autoCursor={true}
              value={downloadInfo.downContent}
              options={editorOptions}
              onBeforeChange={(editor, data, value: string) => {}}
              onChange={(editor, data, value) => {}}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DownloadModal;
