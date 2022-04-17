import { Button, Card, Form, Input, InputNumber } from "antd";
import TextArea from "antd/lib/input/TextArea";
import { FC, useState } from "react";

export const CassandraConnection: FC = () => {
  return (
    <>
      <Form.Item name='name' label='Give the connection a name' rules={[{ required: true, message: "Please enter the connection name" }]}>
        <Input placeholder='Cluster Name' />
      </Form.Item>
      <Form.Item
        name='datacenter'
        label='Provide datacenter name'
        rules={[{ required: true, message: "Please enter the datacenter name" }]}>
        <Input placeholder='default' />
      </Form.Item>
      <Form.Item
        label='Cluster contact points'
        name='contactPoints'
        rules={[{ required: true, message: "Please enter the cluster contact details" }]}>
        <TextArea placeholder={`10.12.200.5:9042\n10.30.50.17:9042`} rows={4} />
      </Form.Item>

      <Form.Item name='username' label='Database username' initialValue={""} rules={[{ required: false }]}>
        <Input placeholder='username' />
      </Form.Item>
      <Form.Item name='password' label='Database password' initialValue={""} rules={[{ required: false }]}>
        <Input.Password placeholder='s3cret' />
      </Form.Item>
    </>
  );
};
