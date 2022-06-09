import { Radio, Space, Button, Tooltip } from "antd";
import React, { FC } from "react";
import { MdEdit, MdSync } from "react-icons/md";
import { HiPlus, HiMinus, HiOutlineDotsHorizontal, HiDownload, HiUpload } from "react-icons/hi";

const TableActionHeader: FC<{
  onRefres: () => void;
  onAddRow: () => void;
  onDeleteRow: () => void;
  onUploadData: () => void;
  onEditRow: () => void;
  onSaveRow: () => void;
  onCancel: () => void;
  editingKey: string;
  onDownloadDataModal: () => void;
  selectedRow: any[];
}> = ({ onRefres, onAddRow, onDeleteRow, onDownloadDataModal, onUploadData, onEditRow, onSaveRow, onCancel, selectedRow, editingKey }) => {
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
          {selectedRow.length > 0 && (
            <Tooltip title='Remove Row'>
              <Button size='small' icon={<HiMinus />} onClick={onDeleteRow} />
            </Tooltip>
          )}
          {selectedRow.length === 1 && (
            <Tooltip title='Edit Row'>
              <Button size='small' icon={<MdEdit />} onClick={onEditRow} />
            </Tooltip>
          )}
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
      {editingKey && (
        <Space>
          <Button onClick={onCancel} size='small'>
            Cancel
          </Button>
          <Button onClick={onSaveRow} size='small' type='primary'>
            Save
          </Button>
        </Space>
      )}
    </div>
  );
};

export default TableActionHeader;
