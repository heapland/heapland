import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Modal, Form, Row, Col, Input, Select, InputNumber, Checkbox, Button, Space, message, AutoComplete, Cascader } from "antd";
import React, { FC, useEffect, useState } from "react";
import DBOperations, { getLangDefComp } from "../../../components/DBOperation/DBOperation";
import { INewColName } from "../../../components/DBOperation/PGSQLOperation";
import { isVarCharType } from "../../../components/utils/utils";
import { TableMeta, TableMetaWithSchema } from "../../../services/Connections";
import { InternalServerError } from "../../../services/SparkService";
import { EditorLang } from "./DatabaseBrowser";

interface IAddNewTable {
  onCloseModal: () => void;
  isAddTableModal: boolean;
  editorLang: EditorLang;
  productName: string;
  connectionId: number;
  schemas: string[];
  dbName: string;
  allTablesWithCol: TableMetaWithSchema;
}

interface Option {
  value: string | number;
  label: string;
  children?: Option[];
}

const AddNewTable: FC<IAddNewTable> = ({
  onCloseModal,
  isAddTableModal,
  editorLang,
  productName,
  connectionId,
  schemas,
  dbName,
  allTablesWithCol,
}) => {
  const dbOps = new DBOperations(productName, connectionId, "", "", []);
  const [addTableForm] = Form.useForm();

  const [isCharType, setCharType] = useState<any[]>([]);
  const [isPrimaryKey, setPrimaryKey] = useState<any[]>([]);
  const [selectedSchema, setSelctedSchema] = useState<string>("");
  const onSelectDataType = (v: any, key: number) => {
    if (isVarCharType(v)) {
      setCharType([...isCharType, key]);
    } else {
      const restKey = isCharType.filter((k) => k !== key);
      setCharType(restKey);
    }
  };

  const onAddCol = async (tableInfo: { colsName: INewColName[]; schemaName: string; tableName: string }) => {
    // console.log(tableInfo);
    const res = await dbOps.method([], []).addNewTable(tableInfo.colsName, tableInfo.schemaName, tableInfo.tableName, dbName);
    if (res.status === 200 && res.parsedBody) {
      message.success("Table created successfully");
      onCloseModal();
    } else if (res.status === 400 && res.parsedBody) {
      let err = res.parsedBody as InternalServerError;
      message.error(err.message);
    }
  };

  const onCheckPrimaryKey = (e: any, key: number) => {
    if (e.target.checked) {
      setPrimaryKey([...isPrimaryKey, key]);
    } else {
      const restKey = isPrimaryKey.filter((p, i) => p !== key);
      setPrimaryKey(restKey);
    }
    const colsValues = addTableForm.getFieldValue("colsName");
    const newColsValue = colsValues.map((c: any, i: any) => {
      if (i == key) {
        return {
          ...c,
          is_not_null: e.target.checked,
        };
      } else {
        return c;
      }
    });
    addTableForm.setFieldsValue({ colsName: newColsValue });
  };

  return (
    <Modal
      width={700}
      centered
      maskClosable={false}
      className='add-table-modal'
      title='Add New Table'
      destroyOnClose={true}
      visible={isAddTableModal}
      footer={null}
      onCancel={onCloseModal}>
      <Form form={addTableForm} requiredMark={false} layout='vertical' name='add_column_form' onFinish={onAddCol} autoComplete='off'>
        <Row gutter={[8, 16]} justify='start' align='middle' style={{ marginBottom: 20 }}>
          {editorLang !== "mysql" && (
            <Col span={12}>
              <Form.Item
                style={{ width: "100%", marginBottom: 0 }}
                label='Schema Name'
                name='schemaName'
                rules={[{ required: true, message: "" }]}>
                <Select
                  placeholder='Select schema'
                  showSearch
                  optionFilterProp='label'
                  onChange={(v) => setSelctedSchema(v as string)}
                  filterOption={(input, option) => (option!.label as unknown as string).toLowerCase().includes(input.toLowerCase())}
                  options={schemas.map((s, i) => {
                    return {
                      value: s,
                      label: s,
                    };
                  })}
                />
              </Form.Item>
            </Col>
          )}
          <Col span={12}>
            <Form.Item
              style={{ width: "100%", marginBottom: 0 }}
              name='tableName'
              label='Table Name'
              rules={[{ required: true, message: "Table name is missing" }]}>
              <Input placeholder='Table Name' />
            </Form.Item>
          </Col>
        </Row>
        <Form.List name='colsName'>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Row key={key} gutter={[8, 8]} justify='start' align='middle' style={{ marginBottom: 15 }}>
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
                  <Col span={8}>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      {...restField}
                      valuePropName='checked'
                      name={[name, "foreign_key"]}
                      rules={[{ required: false }]}>
                      <Cascader
                        options={[
                          ...Object.entries(allTablesWithCol[selectedSchema] ?? {})?.map(([tblName, values]) => {
                            return {
                              value: tblName,
                              label: tblName,
                              children: values.columns.map((c) => {
                                return {
                                  value: c.name,
                                  label: c.name,
                                };
                              }),
                            };
                          }),
                        ]}
                        placeholder='Set foreign key'
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item
                      style={{ marginBottom: 0 }}
                      {...restField}
                      valuePropName='checked'
                      name={[name, "primary_key"]}
                      rules={[{ required: false }]}>
                      <Checkbox onChange={(e) => onCheckPrimaryKey(e, key)}>PRIMARY KEY</Checkbox>
                    </Form.Item>
                  </Col>
                  {editorLang !== "cql" && (
                    <Col span={8}>
                      <Form.Item
                        shouldUpdate={true}
                        style={{ marginBottom: 0 }}
                        {...restField}
                        valuePropName='checked'
                        name={[name, "is_not_null"]}
                        rules={[{ required: false }]}>
                        <Checkbox disabled={!!isPrimaryKey.includes(key)}>NOT NULL</Checkbox>
                      </Form.Item>
                    </Col>
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

export default AddNewTable;
