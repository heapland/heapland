import { Radio, Space, Button, Tooltip, Pagination } from "antd";
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
  openDDL: () => void;
  onPagiChange: (page: number, pageSize: number) => void;
  editingKey: string;
  onDownloadDataModal: () => void;
  selectedRow: any[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
}> = ({
  onRefres,
  onAddRow,
  onDeleteRow,
  onDownloadDataModal,
  onUploadData,
  onEditRow,
  onSaveRow,
  onCancel,
  onPagiChange,
  openDDL,
  selectedRow,
  editingKey,
  currentPage,
  pageSize,
  totalRows,
}) => {
  return (
    <div className='table-action-header file-browser-controls'>
      <div>
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
            <Button size='small' className='label' onClick={openDDL}>
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
      <div className='table-pagination'>
        <div>
          {editingKey && (
            <Space>
              <Button className='edit-cancel-btn' onClick={onCancel} size='small'>
                Cancel
              </Button>
              <Button onClick={onSaveRow} size='small' type='primary'>
                Save
              </Button>
            </Space>
          )}
        </div>

        <Pagination
          size='small'
          pageSize={pageSize}
          defaultPageSize={pageSize}
          simple
          current={currentPage}
          hideOnSinglePage
          onChange={onPagiChange}
          defaultCurrent={currentPage}
          total={totalRows}
        />
      </div>
    </div>
  );
};

export default TableActionHeader;
