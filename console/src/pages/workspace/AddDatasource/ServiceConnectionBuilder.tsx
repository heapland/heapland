import React, { useEffect, useState } from "react";
import { Skeleton, Input, Form, Radio, Drawer, Button, Space, message } from "antd";
import Workspace from "../../../services/Workspace";

import { useForm } from "antd/lib/form/Form";
import { AddConnectionProvider } from "./ConnectionProvider";
import { ConnectionConfig } from "../../../components/connections/ConnectionConfig";
import Connections from "../../../services/Connections";

const connectionRegistry = {
  s3: "com.heapland.services.AWSS3Connection",
  postgresql: "com.heapland.services.PgConnection",
  mysql: "com.heapland.services.MySQLConnection",
  mariadb: "com.heapland.services.MariaDBConnection",
};

const ServiceConnectionBuilder: React.FC<{
  service: string;
  isOpen: boolean;
  onClose: () => void;
  editMode: boolean;
  connectionId?: number;
  initialValues?: any;
}> = ({ service, isOpen, connectionId, editMode, onClose, initialValues }) => {
  const [builderForm] = useForm();
  console.log(initialValues);

  const onFinish = (values: any) => {
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
        onClose();
      });
    }
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
