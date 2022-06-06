import React, { FC, useState, useEffect } from "react";
import Editor, { Monaco, useMonaco } from "@monaco-editor/react";
import { QueryExecutionResult } from "../../../models/DatabaseBrowser";
import { Button, Input, Modal, Select, Space, Checkbox } from "antd";
import { SwitcherTwoTone } from "@ant-design/icons";
import { readSQLInsert, readCSVData, readSQLUpdate, donwloadFile } from "../../../components/utils/utils";
const { Option } = Select;

export type Extractor = "sql_insert" | "csv" | "tsv" | "json" | "sql_update";

interface DownloadInfo {
  extractor: Extractor;
  editorLang: string;
  downContent: any;
}

const DownloadModal: FC<{
  isDownloadModal: boolean;
  closeDownloadModal: () => void;
  schema: string;
  name: string;
  connectionId: number;
  dbName: string;
  tableData: QueryExecutionResult;
}> = ({ isDownloadModal, closeDownloadModal, schema, name, dbName, tableData }) => {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>({
    extractor: "sql_insert",
    editorLang: "sql",
    downContent: "sql_insert",
  });

  const onChangeExtractor = (value: Extractor) => {
    if (value.includes("sql_insert")) {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: "sql",
        downContent: readSQLInsert(tableData?.result, schema, name),
      });
    } else if (value === "sql_update") {
      setDownloadInfo({
        ...downloadInfo,
        extractor: value,
        editorLang: "sql",
        downContent: readSQLUpdate(tableData?.result, schema, name),
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
        downContent: readCSVData(tableData?.result, true),
      });
    } else if (value === "tsv") {
      setDownloadInfo({ ...downloadInfo, extractor: value, editorLang: value, downContent: "tsv" });
    }
  };
  const onDownloadData = async () => {
    donwloadFile(downloadInfo.downContent, name, downloadInfo.extractor);
  };
  useEffect(() => {
    // if (tableData.result && name && schema) {
    //   setDownloadInfo({
    //     ...downloadInfo,
    //     downContent: readSQLInsert(tableData.result, schema, name),
    //   });
    // }
  }, []);
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
          <Button>Cancel</Button>
          <Button>Copy to Clipboard</Button>
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
            <Input placeholder={dbName + "." + schema + "." + name} disabled />
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
          <div className='form-group'>
            <Checkbox onChange={() => {}}>Add table definitioni (DDL)</Checkbox>
          </div>
          <div className='form-group'>
            <div className='input-label'>Output file:</div>
            <Input type='file' placeholder='' />
          </div>
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
