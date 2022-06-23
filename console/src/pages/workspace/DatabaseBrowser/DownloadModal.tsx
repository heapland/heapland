import React, { FC, useState, useEffect } from "react";
import Editor, { Monaco, useMonaco } from "@monaco-editor/react";
import { QueryExecutionResult } from "../../../models/DatabaseBrowser";
import { Button, Input, Modal, Select, Space, Checkbox, message } from "antd";
import { SwitcherTwoTone } from "@ant-design/icons";
import {
  createSQLInsert,
  readCSVData,
  readTSVData,
  createSQLUpdate,
  donwloadFile,
  copyTextToClipboard,
} from "../../../components/utils/utils";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
const { Option } = Select;

export type Extractor = "sql_insert" | "csv" | "tsv" | "json" | "sql_update";

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
}> = ({ isDownloadModal, closeDownloadModal, schema, tableName, dbName, tableData }) => {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>({
    extractor: "sql_insert",
    editorLang: "sql",
    downContent: "sql_insert",
    isColumnHeader: false,
    isRowHeader: false,
    isTableDefinition: false,
  });

  const onChangeExtractor = (value: Extractor) => {
    if (value.includes("sql_insert")) {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: "sql",
        downContent: createSQLInsert(tableData, schema, tableName, false),
        isTableDefinition: false,
      });
    } else if (value === "sql_update") {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: "sql",
        downContent: createSQLUpdate(tableData, schema, tableName),
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
    // if (tableData.result && name && schema) {
    //   setDownloadInfo({
    //     ...downloadInfo,
    //     downContent: createSQLInsert(tableData.result, schema, name),
    //   });
    // }
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
        downContent: createSQLInsert(tableData, schema, tableName, checked),
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
          <Button className='copy-text-btn' onClick={() => copyTextToClipboard(downloadInfo.downContent, message)}>
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
              <Option value='sql_insert'>SQL Insert</Option>
              <Option value='sql_update'>SQL Update</Option>
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
                <Checkbox name='column' onChange={onShowColumnRow}>
                  Add column header
                </Checkbox>
              </div>
              <div className='form-group'>
                <Checkbox name='row' onChange={onShowColumnRow}>
                  Add row header
                </Checkbox>
              </div>
            </>
          )}
        </Space>
        <div className='preview-container'>
          <div className='preview-title'>Export Preview:</div>
          {tableData?.result && (
            <Editor
              height='430px'
              value={downloadInfo.downContent}
              defaultLanguage={downloadInfo.editorLang}
              language={downloadInfo.editorLang}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DownloadModal;
