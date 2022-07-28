import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Modal, Form, Row, Col, Input, Select, InputNumber, Checkbox, Button, Space } from "antd";
import React, { FC, useState } from "react";
import { getLangDefComp } from "../../../components/DBOperation/DBOperation";
import { INewColName } from "../../../components/DBOperation/PGSQLOperation";
import { isVarCharType } from "../../../components/utils/utils";

interface IAddNewColumn {
  isAddColModal: boolean;
  onAddCol: (colInfo: { colsName: INewColName[] }) => void;
  editorLang: string;
  onCloseModal: () => void;
}

const AddNewColumn: FC<IAddNewColumn> = ({ isAddColModal, onAddCol, editorLang, onCloseModal }) => {
  const [addNewColForm] = Form.useForm();

  const [isCharType, setCharType] = useState<any[]>([]);

  const onSelectDataType = (v: any, key: number) => {
    if (isVarCharType(v)) {
      setCharType([...isCharType, key]);
    } else {
      const restKey = isCharType.filter((k) => k !== key);
      setCharType(restKey);
    }
  };
  return (
    <Modal
      width={700}
      centered
      maskClosable={false}
      className='add-column-modal'
      title='Add New Column'
      destroyOnClose={true}
      visible={isAddColModal}
      footer={null}
      onCancel={onCloseModal}>
      <Form form={addNewColForm} name='add_column_form' onFinish={onAddCol} autoComplete='off'>
        <Form.List name='colsName'>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Row key={key} gutter={[8, 8]} justify='start' align='middle' style={{ marginBottom: 20 }}>
                  <Col span={8}>
                    <Form.Item
                      style={{ width: "100%", marginBottom: 0 }}
                      {...restField}
                      name={[name, "colName"]}
                      rules={[{ required: true, message: "Column name is missing" }]}>
                      <Input placeholder='Column Name' />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      style={{ width: "100%", marginBottom: 0 }}
                      {...restField}
                      name={[name, "datatype"]}
                      rules={[{ required: true, message: "Datatype is missing" }]}>
                      <Select
                        placeholder='Select Datatype'
                        showSearch
                        optionFilterProp='label'
                        filterOption={(input, option) => (option!.label as unknown as string).toLowerCase().includes(input.toLowerCase())}
                        options={getLangDefComp(editorLang).dataTypes.map((v, i) => {
                          return {
                            value: v.key.toLowerCase(),
                            label: v.key,
                          };
                        })}
                        onChange={(v) => onSelectDataType(v, key)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    {isCharType.includes(key) && (
                      <Form.Item
                        style={{ marginBottom: 0 }}
                        {...restField}
                        name={[name, "charNumber"]}
                        rules={[{ required: true, message: "No. of Char is missing" }]}>
                        <InputNumber min={0} style={{ height: "32.5px", width: 120 }} placeholder='No. of Char' />
                      </Form.Item>
                    )}
                  </Col>
                  <Col span={3}>
                    <MinusCircleOutlined className='remove-col-icon' onClick={() => remove(name)} />
                  </Col>
                  {editorLang !== "cql" && (
                    <>
                      <Col span={8}>
                        <Form.Item
                          style={{ marginBottom: 0 }}
                          {...restField}
                          valuePropName='checked'
                          name={[name, "primary_key"]}
                          rules={[{ required: false }]}>
                          <Checkbox>PRIMARY KEY</Checkbox>
                        </Form.Item>
                      </Col>

                      <Col span={8}>
                        <Form.Item
                          style={{ marginBottom: 0 }}
                          {...restField}
                          valuePropName='checked'
                          name={[name, "is_not_null"]}
                          rules={[{ required: false }]}>
                          <Checkbox>NOT NULL</Checkbox>
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </Row>
              ))}
              <Form.Item style={{ marginTop: 30 }}>
                <Button type='dashed' className='add-newcol-btn' onClick={() => add()} block icon={<PlusOutlined />}>
                  Add new column
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
          <Space style={{ float: "right" }} align='center'>
            <Button className='modal-cancel-btn' onClick={onCloseModal} style={{ float: "right" }}>
              Cancel
            </Button>
            <Button type='primary' htmlType='submit'>
              Submit
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddNewColumn;
