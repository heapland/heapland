import React, { useEffect, useState } from "react";
import { Form, Drawer, Button, Space, message } from "antd";

import { useForm } from "antd/lib/form/Form";
import { AddConnectionProvider } from "./ConnectionProvider";
import Connections from "../../../services/Connections";
import { history } from "../../../configureStore";
import { UserContext } from "../../../store/User";

const connectionRegistry = {
  s3: "com.heapland.services.AWSS3Connection",
  postgresql: "com.heapland.services.PgConnection",
  mysql: "com.heapland.services.MySQLConnection",
  mariadb: "com.heapland.services.MariaDBConnection",
  cassandra: "com.heapland.services.CassandraConnection",
  kafka: "com.heapland.services.KafkaConnection",
};

const dbConnections = ["s3", "postgresql", "mysql", "mariadb", "cassandra", "kafka"];

const ServiceConnectionBuilder: React.FC<{
  orgSlugId: string;
  workspaceId: number;
  service: string;
  isOpen: boolean;
  onClose: () => void;
  editMode: boolean;
  available: boolean;
  connectionId?: number;
  initialValues?: any;
}> = ({ orgSlugId, workspaceId, service, isOpen, connectionId, editMode, onClose, initialValues }) => {
  const [builderForm] = useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const context = React.useContext(UserContext);
  const onFinish = (values: any) => {
    builderForm.getFieldsValue();
    values["_type"] = connectionRegistry[service.toLowerCase()];
    if (editMode) {
      console.log("Updating the connection");
      Connections.updateConnection(connectionId, values["name"], service, JSON.stringify(values), 1, (r) => {
        message.success(`Connection has been updated`);
        onClose();
      });
    } else {
      Connections.saveConnection(values["name"], service, JSON.stringify(values), 1, (r) => {
        message.success(`Connection has been saved`);
        Connections.listConnections((c) => {
          context.updateConnections(c);
        });
        history.push(`/${orgSlugId}/workspace/${workspaceId}/connections`);
        onClose();
      });
    }
  };

  const testConnection = () => {
    builderForm.validateFields().then((v) => {
      if (dbConnections.includes(service.toLowerCase())) {
        setLoading(true);
        v["_type"] = connectionRegistry[service.toLowerCase()];
        Connections.testDBConnection(v["name"], service, JSON.stringify(v), 1, () => {
          setLoading(false);
        });
      }
    });
  };

  useEffect(() => {
    builderForm.resetFields();
  }, [isOpen]);

  return (
    <Drawer
      title={`Connect ${service}`}
      width={500}
      visible={isOpen}
      bodyStyle={{ paddingBottom: 80 }}
      onClose={onClose}
      closable={true}
      footer={
        <Space>
          <Button type='primary' onClick={(e) => builderForm.submit()}>
            {editMode ? "Update Connection" : "Save Connection"}
          </Button>

          <Button className='test-connection-btn' loading={loading} type='default' onClick={(e) => testConnection()}>
            Test Connection
          </Button>
        </Space>
      }>
      <Form
        layout={"vertical"}
        name='basic'
        requiredMark={false}
        form={builderForm}
        initialValues={initialValues}
        onFinish={onFinish}
        className='config-deploy-form wizard-form'>
        <AddConnectionProvider service={service.toLowerCase()} connectionForm={builderForm} />
      </Form>
    </Drawer>
  );
};

export default ServiceConnectionBuilder;
