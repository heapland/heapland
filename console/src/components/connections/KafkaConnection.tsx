import { Button, Card, Form, Input, InputNumber } from "antd";
import TextArea from "antd/lib/input/TextArea";
import { FC, useState } from "react";

export const KafkaConnection: FC = () => {
  return (
    <>
      <Form.Item name='name' label='Give the connection a name' rules={[{ required: true, message: "Please enter the connection name" }]}>
        <Input placeholder='Cluster Name' />
      </Form.Item>
      <Form.Item
        name='bootstrapServers'
        label='Bootstrap servers'
        rules={[{ required: true, message: "Please enter the bootstrap servers" }]}>
        <Input placeholder='localhost:9092' />
      </Form.Item>
      <Form.Item label='Additional properties' name='additionalProperties' rules={[{ required: false }]} initialValue=''>
        <TextArea placeholder={`sasl.jaas.config=\nsecurity.protocol=`} rows={5} value={""} />
      </Form.Item>
    </>
  );
};
