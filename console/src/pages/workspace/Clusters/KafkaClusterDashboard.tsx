import { Space, Tabs, Button, Modal, Form, Input, InputNumber, Alert, message, Dropdown, Menu } from "antd";
import React, { FC, useState, useEffect } from "react";
import "../WorkspaceDashboard/WorkspaceDashboard.scss";
import "../Workspace.scss";
import "./Clusters.scss";
import { history } from "../../../configureStore";
import KafkaImg from "../../../static/img/kafka.png";
import { bytesToSize, calculatePer, getLocalStorage } from "../../../services/Utils";
import Connections from "../../../services/Connections";
import Workspace from "../../../services/Workspace";
import KafkaBrokersTable from "../../../components/clusters/kafka/BrokersTable";
import { KafkaTopicsTable } from "../../../components/clusters/kafka/TopicTable";
import TopicsDetails from "../../../components/clusters/kafka/TopicsDetails";
import ConsumerGroups from "../../../components/clusters/kafka/ConsumerGroups";
import { UserContext } from "../../../store/User";
import ServiceConnectionBuilder from "../Connections/ServiceConnectionBuilder";
import { MdOutlineMoreHoriz } from "react-icons/md";

const { TabPane } = Tabs;
export type activeTab = "broker" | "topic" | "consumer-groups";

export interface DownloadStatus {
  downPer: number;
  downValue: string;
  totalValue: string;
}

const KafkaClusterDashboard: FC<{ orgSlugId: string; workspaceId: number; connectionId: number }> = ({
  orgSlugId,
  workspaceId,
  connectionId,
}) => {
  const context = React.useContext(UserContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [topicId, setTopicId] = useState<string>(null);
  const [isExpand, setExpand] = React.useState<boolean>(getLocalStorage("isHeaderExpand") ?? true);

  const [topicBuilder, setTopicBuilder] = useState<{ showModal: boolean; hasTopicCreated: boolean }>({
    showModal: false,
    hasTopicCreated: true,
  });
  const [topicForm] = Form.useForm();

  const [clusterState, setClusterState] = useState<{
    isRunning: boolean;
    name: string;
    provider: string;
    loading: boolean;
    editMode: boolean;
    errorMessage?: string;
  }>({
    loading: false,
    isRunning: false,
    editMode: false,
    name: "",
    provider: "",
  });

  const [tabsView, setTabsView] = useState<{ activeTab: activeTab }>({
    activeTab: "broker",
  });

  const onTabsChange = (v: string) => {
    setTabsView({ ...tabsView, activeTab: v as activeTab });
  };

  const fetchKafkaClusterInfo = () => {
    Workspace.describeKafkaCluster(
      connectionId,
      (result) => {
        setClusterState({
          ...clusterState,
          isRunning: true,
          loading: false,
          errorMessage: undefined,
          name: result.name,
          provider: result.provider,
          editMode: false,
        });
      },
      (err) => {
        setClusterState({
          ...clusterState,
          isRunning: false,
          loading: false,
          name: err.connectionName,
          provider: err.provider,
          errorMessage: err.error,
          editMode: false,
        });
      }
    );
  };

  useEffect(() => {
    fetchKafkaClusterInfo();
  }, [connectionId]);

  const enableEditMode = () => {
    setClusterState({ ...clusterState, editMode: true });
  };

  const hideEditMode = () => {
    fetchKafkaClusterInfo();
  };

  const handleDeleteConnection = () => {
    Connections.deleteConnection(connectionId, (r) => {
      message.success("Database Connection was deleted");
      Connections.listConnections((c) => {
        context.updateConnections(c);
      });
      history.push(`/${orgSlugId}/workspace/${workspaceId}/connections`);
    });
  };

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

  const menu = (
    <Menu>
      <Menu.Item key='1' onClick={(e) => deleteWarning("connection")}>
        Delete
      </Menu.Item>
    </Menu>
  );

  const onCreateTopic = (topicInfo: any) => {
    setLoading(true);
    Workspace.createKafkaTopic(connectionId, topicInfo.name, topicInfo.partitions, topicInfo.replicas, (r) => {
      setLoading(false);
      setTopicBuilder({ showModal: false, hasTopicCreated: true });
    });
  };

  const onSelectTopic = (id: string) => {
    setTopicId(id);
  };

  const removeTopic = () => {
    setTopicId(null);
  };

  const onTabClick = (key: string) => {
    if (key === "topic") {
      setTopicId(null);
    }
  };

  const getHeaderExpand = (isExpand: boolean) => {
    setExpand(isExpand);
  };

  return (
    <div className='workspace-wrapper dashboard-container'>
      {clusterState.errorMessage && (
        <div className='error-box'>
          <Alert type='error' message={clusterState.errorMessage} />
          <Space>
            <Button type='primary' onClick={(e) => enableEditMode()}>
              Edit Connection
            </Button>
            <Button type='default' onClick={(e) => deleteWarning("connection")}>
              Delete Connection
            </Button>
          </Space>
        </div>
      )}

      {!clusterState.errorMessage && (
        <>
          <div className='workspace-content-header'>
            <Space>
              <div className='root-breadcrumb'>
                <img style={{ marginRight: 4 }} src={KafkaImg} />
                <div>{clusterState.name}</div>
              </div>
            </Space>
            <div>
              <Dropdown.Button
                overlay={menu}
                onClick={(e) => enableEditMode()}
                placement='bottomLeft'
                trigger={["click"]}
                icon={<MdOutlineMoreHoriz />}>
                Edit
              </Dropdown.Button>
            </div>
          </div>
          <div className='tabs-section card-shadow-light' style={{ minHeight: "500px", backgroundColor: "#fff" }}>
            <Tabs
              defaultActiveKey='broker'
              activeKey={tabsView.activeTab}
              onTabClick={onTabClick}
              onChange={onTabsChange}
              className='jobs-tabs cluster-tabs'
              tabBarExtraContent={
                tabsView.activeTab === "topic" && (
                  <Button
                    type='primary'
                    onClick={() => setTopicBuilder({ showModal: true, hasTopicCreated: false })}
                    disabled={!clusterState.isRunning}>
                    Create Topic
                  </Button>
                )
              }>
              <TabPane
                tab='Brokers'
                key='broker'
                className='jobs-tab-pane'
                style={{ minHeight: isExpand ? "calc(100vh - 245px)" : "calc(100vh - 200px)" }}>
                {tabsView.activeTab === "broker" && (
                  <KafkaBrokersTable
                    orgSlugId={orgSlugId}
                    workspaceId={workspaceId}
                    clusterId={connectionId}
                    isRunning={clusterState.isRunning}
                  />
                )}
              </TabPane>
              <TabPane
                tab='Topics'
                key='topic'
                className='jobs-tab-pane'
                style={{ minHeight: isExpand ? "calc(100vh - 245px)" : "calc(100vh - 200px)" }}>
                {topicId === null && tabsView.activeTab === "topic" && (
                  <KafkaTopicsTable
                    orgSlugId={orgSlugId}
                    workspaceId={workspaceId}
                    clusterId={connectionId}
                    hasTopicCreated={topicBuilder.hasTopicCreated}
                    onSelectTopic={onSelectTopic}
                    isRunning={clusterState.isRunning}
                  />
                )}
                {topicId && (
                  <TopicsDetails
                    orgSlugId={orgSlugId}
                    workspaceId={workspaceId}
                    clusterId={connectionId}
                    topic={topicId}
                    removeTopicId={removeTopic}
                    isRunning={clusterState.isRunning}
                  />
                )}
              </TabPane>
              <TabPane
                tab='Consumer Groups'
                key='consumer-groups'
                className='jobs-tab-pane'
                style={{ minHeight: true ? "calc(100vh - 245px)" : "calc(100vh - 200px)" }}>
                {tabsView.activeTab === "consumer-groups" && (
                  <ConsumerGroups
                    orgSlugId={orgSlugId}
                    workspaceId={workspaceId}
                    clusterId={connectionId}
                    isRunning={clusterState.isRunning}
                  />
                )}
              </TabPane>
            </Tabs>
            <Modal
              maskClosable={false}
              destroyOnClose={true}
              title='Create a Topic'
              visible={topicBuilder.showModal}
              footer={null}
              onCancel={() => {
                setTopicBuilder({ showModal: false, hasTopicCreated: false });
                topicForm.resetFields();
              }}>
              <Form
                layout={"vertical"}
                name='topic-form'
                requiredMark={false}
                initialValues={{ replicas: 1, partitions: 1 }}
                form={topicForm}
                onFinish={onCreateTopic}
                className='kafka-topic-form'>
                <Form.Item name='name' label='Name' rules={[{ required: true, message: "Please enter the Topic name" }]}>
                  <Input placeholder='Name' />
                </Form.Item>
                <Form.Item
                  name='partitions'
                  label='Partitions'
                  rules={[{ required: true, message: "Please enter the partitions , min:1 and max:10" }]}>
                  <InputNumber style={{ width: "100%", border: "none" }} placeholder='Partitions' min={1} max={10} />
                </Form.Item>
                <Form.Item
                  name='replicas'
                  label='Replicas'
                  rules={[{ required: true, message: "Please enter the replicas , min:1 and max:10" }]}>
                  <InputNumber style={{ width: "100%", border: "none" }} placeholder='No of replicas' min={1} max={10} />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type='primary' loading={loading} htmlType='submit' style={{ float: "right" }} className='btn-action-light'>
                    Create
                  </Button>
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </>
      )}
      <ServiceConnectionBuilder
        orgSlugId={orgSlugId}
        workspaceId={workspaceId}
        service={clusterState.provider}
        isOpen={clusterState.editMode}
        connectionId={connectionId}
        editMode={true}
        onClose={hideEditMode}
        available={true}
        initialValues={{ name: clusterState.name }}
      />
    </div>
  );
};
export default KafkaClusterDashboard;
