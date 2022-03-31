import {
  Breadcrumb,
  Button,
  Space,
  Table,
  Tooltip,
  List,
  message,
  Avatar,
  Skeleton,
  Alert,
  Dropdown,
  Menu,
  Popconfirm,
  Modal,
  Empty,
  Form,
  Input,
  Upload,
  Drawer,
  Statistic,
  Row,
  Col,
} from "antd";
import * as React from "react";
import { FileBrowserProps, FileItem, FileListing, FileSummary } from "../../models/FileBrowser";
import S3Img from "../../static/img/s3.png";
import { MdCreateNewFolder, MdDelete, MdFileDownload, MdFileUpload, MdFolder, MdInfo, MdOutlineMoreHoriz, MdSync } from "react-icons/md";
import "./FileBrowser.scss";
import { bytesToSize, getReadableTime } from "../../services/Utils";
import { FaFile, FaFileCsv, FaFileImage, FaFilePdf } from "react-icons/fa";
import VirtualList from "rc-virtual-list";
import ContentLoader from "react-content-loader";
import Connections from "../../services/Connections";
import ServiceConnectionBuilder from "../../pages/workspace/AddDatasource/ServiceConnectionBuilder";
import { cwd } from "process";
import WebService from "../../services/WebService";
import { UploadChangeParam } from "antd/lib/upload";
import { UploadFile } from "antd/lib/upload/interface";
import { string } from "prop-types";
import moment from "moment";
import { UserContext } from "../../store/User";

const FileIcon: React.FC<{ isDirectory: boolean; fileType: string }> = ({ isDirectory, fileType }) => {
  if (isDirectory) {
    return (
      <i>
        <MdFolder />
      </i>
    );
  } else {
    switch (fileType) {
      case "csv":
        return (
          <i>
            <FaFileCsv />
          </i>
        );

      case "png":
      case "jpeg":
      case "jpg":
        return (
          <i>
            <FaFileImage />
          </i>
        );

      case "pdf":
        return (
          <i>
            <FaFilePdf />
          </i>
        );

      default:
        return (
          <i>
            <FaFile />
          </i>
        );
    }
  }
};

const FileSummaryView: React.FC<{
  path: string;
  connectionId: number;
  isOpen: boolean;

  onClose: () => void;
}> = ({ path, connectionId, isOpen, onClose }) => {
  const [fileSummary, setFileSummary] = React.useState<{ loading: boolean; summary?: FileSummary }>({ loading: true });
  React.useEffect(() => {
    Connections.getFileSummary(
      connectionId,
      path,
      (s) => {
        setFileSummary({ ...fileSummary, summary: s, loading: false });
      },
      (f) => {}
    );
  }, []);

  return (
    <Drawer
      title={path.substring(path.lastIndexOf("/") + 1)}
      width={500}
      visible={isOpen}
      className='file-info-drawer'
      onClose={onClose}
      bodyStyle={{ paddingBottom: 80 }}
      closable={true}>
      <Row gutter={16}>
        <Col span={12}>
          {" "}
          <Statistic title='Size' value={fileSummary.loading ? "" : bytesToSize(fileSummary.summary.size)} loading={fileSummary.loading} />
        </Col>
        <Col span={12}>
          {" "}
          <Statistic title='Type' value={fileSummary.loading ? "" : fileSummary.summary.fileType} loading={fileSummary.loading} />
        </Col>
        <Col span={12}>
          <Statistic
            title='Last Modified'
            value={fileSummary.loading ? "" : moment(fileSummary.summary.lastModified).fromNow()}
            loading={fileSummary.loading}
          />
        </Col>
        <Col span={12}>
          <Statistic title='Etag' value={fileSummary.loading ? "" : fileSummary.summary.etag} loading={fileSummary.loading} />
        </Col>
        <Col span={24}>
          <Statistic title='Object URL' value={fileSummary.loading ? "" : fileSummary.summary.objectUrl} loading={fileSummary.loading} />
        </Col>
      </Row>
    </Drawer>
  );
};

export const FileBrowser: React.FC<FileBrowserProps> = ({
  connectionId,
  storageService,
  name,
  editMode,
  cwd,
  fileListLoading,
  items,
  closeEditDrawer,
  showInfoDrawer,
  showEditDrawer,
  updateCWD,
  createDirectory,
  err,
}) => {
  const web = new WebService();
  const onScroll = (e: any) => {};
  const context = React.useContext(UserContext);

  const handleDeleteConnection = () => {
    Connections.deleteConnection(connectionId, (r) => {
      message.success("Connection was deleted");
      Connections.listConnections((c) => {
        context.updateConnections(c);
      });
    });
  };

  const handleDeleteFile = (path: string) => {
    Connections.deleteFile(connectionId, path, (r) => {
      message.success("File was deleted");
      updateCWD(cwd);
    });
  };

  let hasError = false;
  if (typeof err !== "undefined") {
    hasError = true;
  }

  const onUpload = (e: UploadChangeParam<UploadFile<any>>) => {
    const { status } = e.file;

    if (status !== "uploading" && status !== "removed") {
    }
    if (status === "done") {
      message.success(`${e.file.name} file uploaded successfully.`);
      updateCWD(cwd);
    } else if (status === "error") {
      message.error(`${e.file.name} file upload failed.`);
    } else if (status === "removed") {
    }
  };
  let currentDirectory = cwd.join("");
  if (cwd.length === 0) {
    currentDirectory = "/";
  }
  const deleteWarning = (name: string) => {
    Modal.warning({
      title: (
        <span>
          Delete <b>{name}</b>
        </span>
      ),
      content: `Are you sure you want to delete the connection?`,
      onOk: handleDeleteConnection,
      okCancel: true,
      okText: "Yes",
      cancelText: "No",
    });
  };

  const deleteFileWarning = (path: string, fileName: string) => {
    Modal.warning({
      title: (
        <span>
          Delete <b>{fileName}</b> ?
        </span>
      ),
      content: ``,
      onOk: () => handleDeleteFile(path),
      okCancel: true,
      okText: "Yes",
      cancelText: "No",
    });
  };

  const menu = (
    <Menu>
      <Menu.Item key='1' onClick={(e) => deleteWarning(name)}>
        Delete
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <div className='workspace-content-header'>
        <Space>
          <div className='root-breadcrumb' onClick={(e) => updateCWD([])}>
            <img style={{ marginRight: 4 }} src={S3Img} />
            <div>{name}</div>
          </div>
          <div>&gt;</div>
          <Breadcrumb separator='>'>
            {cwd.map((d, i) => (
              <Breadcrumb.Item key={i}>
                <Button className='btn-breadcrumb' type='link' size='small' onClick={(e) => updateCWD(cwd.splice(0, i + 1))}>
                  {d.substring(0, d.length - 1)}
                </Button>
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
        </Space>
        <div>
          <Dropdown.Button overlay={menu} onClick={showEditDrawer} placement='bottomLeft' trigger={["click"]} icon={<MdOutlineMoreHoriz />}>
            Edit
          </Dropdown.Button>
        </div>
      </div>
      {!hasError && (
        <div className='file-browser-controls'>
          <Space>
            <Tooltip title='Refresh'>
              <Button icon={<MdSync />} onClick={(e) => updateCWD(cwd)}></Button>
            </Tooltip>

            <Tooltip title='New Directory'>
              <Button icon={<MdCreateNewFolder />} onClick={(e) => createDirectory()}></Button>
            </Tooltip>

            <Tooltip title='Upload file'>
              <Upload
                action={`${web.getEndpoint()}/web/v1/fs/${connectionId}/upload/${currentDirectory}`}
                withCredentials={true}
                showUploadList={false}
                name='file'
                accept='*/*'
                onChange={onUpload}>
                <Button icon={<MdFileUpload />}></Button>
              </Upload>
            </Tooltip>
          </Space>
        </div>
      )}
      <Skeleton paragraph={{ rows: 4 }} loading={fileListLoading}>
        {hasError && (
          <div style={{ margin: "20px 20px 20px 20px" }}>
            <Alert message='Error' description={err} type='error' showIcon />
            <Space style={{ marginTop: 20, alignItems: "center" }}></Space>
          </div>
        )}
        {!hasError && items.length === 0 && <Empty style={{ marginTop: 20 }} description='No objects found'></Empty>}
        {items.length > 0 && (
          <>
            <div>
              <List className='file-list'>
                <VirtualList data={items} itemHeight={40} itemKey='name' onScroll={onScroll}>
                  {(item) => (
                    <List.Item
                      key={item.name}
                      onClick={(e: any) => {
                        e.preventDefault();

                        if (item.isDirectory) {
                          updateCWD([...cwd, item.name]);
                        } else {
                          showInfoDrawer(cwd.join("") + item.name);
                        }
                      }}
                      className='file-item'
                      actions={
                        item.isDirectory
                          ? []
                          : [
                              <Button icon={<MdInfo />} onClick={(e) => showInfoDrawer(cwd.join("") + item.name)}></Button>,
                              <Tooltip title='Delete file'>
                                <Button
                                  onClick={(e: React.MouseEvent<HTMLElement>) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteFileWarning(cwd.join("") + item.name, item.name);
                                  }}
                                  icon={<MdDelete />}></Button>
                              </Tooltip>,
                            ]
                      }>
                      <List.Item.Meta
                        className='file-meta'
                        avatar={<FileIcon isDirectory={item.isDirectory} fileType={item.extension || ""} />}
                        title={item.name}
                        description={item.isDirectory ? "--" : bytesToSize(item.size)}
                      />
                    </List.Item>
                  )}
                </VirtualList>
              </List>
            </div>
          </>
        )}
      </Skeleton>

      <ServiceConnectionBuilder
        service={storageService}
        isOpen={editMode}
        connectionId={connectionId}
        editMode={true}
        onClose={() => {
          updateCWD(cwd);
        }}
        initialValues={{ name: name }}
      />
    </>
  );
};

export const FileManager: React.FC<{ connectionId: number }> = ({ connectionId }) => {
  const [directoryForm] = Form.useForm();
  const [fileStatus, setFileStatus] = React.useState<{
    isValid: boolean;
    loading: boolean;
    editMode: boolean;
    viewFileInfo: boolean;
    createDirectoryMode: boolean;
    fileListLoading: boolean;
    listing?: FileListing;
    cwd: string[];
    refreshStatus: boolean;
    err?: string;
  }>({
    isValid: false,
    loading: true,
    createDirectoryMode: false,
    fileListLoading: false,
    editMode: false,
    viewFileInfo: false,
    refreshStatus: true,
    cwd: [],
  });

  const [fileInfo, setFileInfo] = React.useState<{
    isAvailable: boolean;
    loading: boolean;
    path?: string;
    summary?: FileSummary;
  }>({
    loading: true,
    isAvailable: false,
  });

  const closeFileView = () => {
    setFileInfo({ ...fileInfo, isAvailable: false });
  };

  const openFileView = (path: string) => {
    setFileInfo({ ...fileInfo, isAvailable: true, path: path });
  };

  const listRootObjects = () => {
    Connections.listRootDirs(
      connectionId,
      (r) => {
        setFileStatus({ ...fileStatus, loading: false, listing: r, err: undefined });
      },
      (err) => {
        setFileStatus({
          ...fileStatus,
          loading: false,
          err: err.error,
          listing: {
            fsName: err.name,
            files: [],
            hasMore: false,
            provider: err.provider,
          },
        });
      }
    );
  };

  React.useEffect(() => {
    listRootObjects();
  }, [connectionId]);

  React.useEffect(() => {
    if (fileStatus.cwd.length === 0) {
      console.log("listing root objects");
      listRootObjects();
    } else {
      console.log("listing file objects");
      listObjects(fileStatus.cwd.join(""));
    }
  }, [fileStatus.cwd, fileStatus.refreshStatus]);

  const closeEditDrawer = () => {
    console.log("setting edit drawer as");
    setFileStatus({ ...fileStatus, editMode: false });
  };

  const openCreateDirectoryForm = () => {
    setFileStatus({ ...fileStatus, createDirectoryMode: true });
  };

  const closeCreateDirectoryForm = () => {
    setFileStatus({ ...fileStatus, createDirectoryMode: false });
  };

  const handleCreateDirectory = () => {
    directoryForm.submit();
  };

  const onDirectoryFormSubmission = (values: any) => {
    const dirName = `${values["directory"]}/`;
    Connections.createDirectory(connectionId, `${fileStatus.cwd.join("")}${dirName}`, (r) => {
      if (r.success) {
        message.success("New directory created");
        directoryForm.resetFields();
        setFileStatus({ ...fileStatus, cwd: [...fileStatus.cwd, dirName], createDirectoryMode: false });
      } else {
        message.error("Failed creating the directory");
        directoryForm.resetFields();
        closeCreateDirectoryForm();
      }
    });
  };

  const listObjects = (path: string) => {
    let normalizedPath = path;
    if (path.endsWith("/")) {
      normalizedPath = path.substring(0, path.length - 1);
    }
    setFileStatus({ ...fileStatus, fileListLoading: true });
    let cwd = normalizedPath.split("/");
    Connections.listFiles(
      connectionId,
      path,
      (objects) => {
        setFileStatus({ ...fileStatus, listing: objects, err: undefined, fileListLoading: false });
      },
      (err) => {
        setFileStatus({
          ...fileStatus,
          loading: false,
          err: err.error,
          fileListLoading: false,
          listing: {
            fsName: err.name,
            files: [],
            hasMore: false,
            provider: err.provider,
          },
        });
      }
    );
  };

  const updateCWD = (cwd: string[]) => {
    setFileStatus({ ...fileStatus, editMode: false, cwd: cwd, refreshStatus: !fileStatus.refreshStatus });
  };

  const showEditDrawer = () => {
    setFileStatus({ ...fileStatus, editMode: true });
  };

  return (
    <>
      <Skeleton avatar paragraph={{ rows: 4 }} loading={fileStatus.loading}>
        {fileStatus.listing && (
          <FileBrowser
            connectionId={connectionId}
            cwd={fileStatus.cwd}
            items={fileStatus.listing.files}
            storageService={fileStatus.listing.provider}
            editMode={fileStatus.editMode}
            name={fileStatus.listing.fsName}
            closeEditDrawer={closeEditDrawer}
            showEditDrawer={showEditDrawer}
            updateCWD={updateCWD}
            fileListLoading={fileStatus.fileListLoading}
            createDirectory={openCreateDirectoryForm}
            showInfoDrawer={openFileView}
            err={fileStatus.err}
          />
        )}
      </Skeleton>
      <Modal
        title='Create new directory'
        visible={fileStatus.createDirectoryMode}
        onOk={handleCreateDirectory}
        onCancel={closeCreateDirectoryForm}
        okText='Create'
        cancelText='Cancel'>
        <Form layout='vertical' form={directoryForm} requiredMark={false} onFinish={onDirectoryFormSubmission} scrollToFirstError>
          <Form.Item name='directory' label='Directory name' rules={[{ required: true, message: "This field is required." }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      {fileInfo.isAvailable && (
        <FileSummaryView isOpen={fileInfo.isAvailable} onClose={closeFileView} path={fileInfo.path} connectionId={connectionId} />
      )}
    </>
  );
};
