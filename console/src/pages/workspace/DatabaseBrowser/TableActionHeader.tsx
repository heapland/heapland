import { Radio, Space, Button, Tooltip } from "antd";
import React, { FC } from "react";
import { RiRefreshLine } from "react-icons/ri";
import { MdSync } from "react-icons/md";
import { HiPlus, HiMinus, HiOutlineDotsHorizontal, HiDownload, HiUpload } from "react-icons/hi";

const TableActionHeader: FC<{
  onRefres: () => void;
  onAddRow: () => void;
  onDeleteRow: () => void;
  onUploadData: () => void;
  onDownloadDataModal: () => void;
}> = ({ onRefres, onAddRow, onDeleteRow, onDownloadDataModal, onUploadData }) => {
  return (
    <div className='table-action-header file-browser-controls'>
      <Space align='center'>
        <div className='action-btn-group'>
          <Tooltip title='Refresh Table'>
            <Button size='small' icon={<MdSync />} onClick={onRefres} />
          </Tooltip>
          <Tooltip title='Add Row'>
            <Button size='small' icon={<HiPlus />} onClick={onAddRow} />
          </Tooltip>
          <Tooltip title='Remove Row'>
            <Button size='small' icon={<HiMinus />} onClick={onDeleteRow} />
          </Tooltip>
          <Tooltip title='More Action'>
            <Button size='small' icon={<HiOutlineDotsHorizontal />} />
          </Tooltip>
        </div>
        <div className='action-btn-group'>
          <Button size='small' className='label'>
            DDL
          </Button>
        </div>
        <div className='action-btn-group'>
          <Tooltip title='Download Data'>
            <Button size='small' icon={<HiDownload />} onClick={onDownloadDataModal} />
          </Tooltip>
          <Tooltip title='Upload Data'>
            <Button size='small' icon={<HiUpload />} onClick={onUploadData} />
          </Tooltip>
        </div>
      </Space>
    </div>
  );
};

export default TableActionHeader;
