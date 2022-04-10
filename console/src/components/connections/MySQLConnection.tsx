import { Button, Card, Form, Input, InputNumber } from "antd";
import { FC, useState } from "react";

export const MySQLConnection: FC = () => {
  return (
    <>
      <Form.Item name='name' label='Give the connection a name' rules={[{ required: true, message: "Please enter the connection name" }]}>
        <Input placeholder='Cluster Name' />
      </Form.Item>
      <Form.Item name='database' label='Provide database name' rules={[{ required: true, message: "Please enter the database name" }]}>
        <Input placeholder='default' />
      </Form.Item>
      <Form.Item label='Database host/port'>
        <Input.Group compact>
          <Form.Item name={["hostname"]} noStyle rules={[{ required: true, message: "hostname is required" }]}>
            <Input style={{ width: "50%" }} placeholder='127.0.0.1' />
          </Form.Item>
          <Form.Item name={["port"]} noStyle rules={[{ required: false }]}>
            <InputNumber style={{ width: "50%" }} placeholder='3306' value={3306} />
          </Form.Item>
        </Input.Group>
      </Form.Item>

      <Form.Item name='username' label='Database username' rules={[{ required: true, message: "Please enter the database username" }]}>
        <Input placeholder='postgres' />
      </Form.Item>
      <Form.Item name='password' label='Database password' rules={[{ required: true, message: "Please enter the database password" }]}>
        <Input.Password placeholder='s3cret' />
      </Form.Item>
    </>
  );
};
