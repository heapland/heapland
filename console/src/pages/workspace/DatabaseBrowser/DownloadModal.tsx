import React, { FC } from "react";
import { Button, Input, Modal, Select, Space } from "antd";
const { Option } = Select;

const DownloadModal: FC<{
  isDownloadModal: boolean;
  closeDownloadModal: () => void;
  schema: string;
  name: string;
  connectionId: number;
  dbName: string;
}> = ({ isDownloadModal, closeDownloadModal, schema, name, dbName }) => {
  const onDownloadData = () => {};
  return (
    <Modal
      width={1000}
      bodyStyle={{ height: 500 }}
      centered={true}
      className='download-modal-wrapper'
      title='Export Data'
      visible={isDownloadModal}
      onOk={onDownloadData}
      footer={
        <Space>
          <Button>Cancel</Button>
          <Button>Copy to Clipboard</Button>
          <Button type='primary'>Export to file</Button>
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
              placeholder='Select a person'
              optionFilterProp='children'
              defaultValue='sql_insert'
              onChange={() => {}}
              filterOption={(input, option) => (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())}>
              <Option value='sql_insert'>SQL Insert</Option>
              <Option value='sql_update'>SQL Update</Option>
              <Option value='csv'>CSV</Option>
              <Option value='tsv'>TSV</Option>
              <Option value='json'>JSON</Option>
            </Select>
          </div>
          <div className='form-group'>
            <div className='input-label'>Output file:</div>
            <Input type='file' placeholder='' />
          </div>
        </Space>
        <div className='preview-container'>
          <div className='preview-title'>Export Preview:</div>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadModal;
