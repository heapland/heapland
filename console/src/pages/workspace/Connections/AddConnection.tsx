import React, { FC, useEffect, useState } from "react";
import "./AddDatasource.scss";
import { Drawer, Menu } from "antd";

import { ConnectionCard } from "../../../components/Cards/DatasourceCard";
import ServiceConnectionBuilder from "./ServiceConnectionBuilder";
import Connections, { ConnectionMeta } from "../../../services/Connections";

const AddDatasource: FC<{ orgSlugId: string; workspaceId: number }> = ({ orgSlugId, workspaceId }) => {
  const [selectedKey, setSelectedKey] = React.useState("file-system");
  const [sourceDrawer, setSrouceDrawer] = React.useState<{ isOpen: boolean; name: string; isAvailable: boolean }>({
    isOpen: false,
    isAvailable: true,
    name: "",
  });
  const selectMenu = (e: any) => {
    setSelectedKey(e.key);
  };

  const onCloseDrawer = () => {
    setSrouceDrawer({ ...sourceDrawer, isOpen: false });
  };

  const openSourceDrawer = (name: string) => {
    setSrouceDrawer({ ...sourceDrawer, isOpen: true, name: name, isAvailable: name !== "kafka" });
  };

  const [connections, setConnections] = React.useState<{ loading: boolean; connProviders: ConnectionMeta[] }>({
    loading: true,
    connProviders: [],
  });

  useEffect(() => {
    Connections.getConnectionProviders((r) => {
      setConnections({ ...connections, loading: false, connProviders: r });
    });
  }, []);

  return (
    <div className='add-datasource-wrapper'>
      <div className='header-title'>Add Connection</div>
      <div className='data-source-menu'>
        <Menu onClick={selectMenu} selectedKeys={[selectedKey]} mode='horizontal'>
          <Menu.Item key='file-system'>
            <a className='file-system' href='#file-system'>
              File System
            </a>
          </Menu.Item>
          <Menu.Item key='databases'>
            <a className='databases' href='#databases'>
              Databases
            </a>
          </Menu.Item>
          <Menu.Item key='messaging-system'>
            <a className='messaging-system' href='#messaging-system'>
              Streams
            </a>
          </Menu.Item>
        </Menu>
      </div>
      <div className='data-source-list'>
        <div id='file-system' className='data-source-section'>
          <div className='tabs-title'>File System</div>
          <div className='sources-cards'>
            {connections.connProviders
              .filter((c) => c.category === "fs")
              .map((c, i) => (
                <ConnectionCard key={i} name={c.name} description={c.description} onClickAdd={openSourceDrawer} />
              ))}
          </div>
        </div>
        <div id='databases' className='data-source-section'>
          <div className='tabs-title'>Databases</div>
          <div className='sources-cards'>
            {connections.connProviders
              .filter((c) => c.category === "rdbms")
              .map((c, i) => (
                <ConnectionCard key={i} name={c.name} description={c.description} onClickAdd={openSourceDrawer} />
              ))}
          </div>
        </div>
        <div id='messaging-system' className='data-source-section'>
          <div className='tabs-title'>Messaging System</div>
          <div className='sources-cards'>
            {connections.connProviders
              .filter((c) => c.category === "messaging")
              .map((c) => (
                <ConnectionCard key={c.name} name={c.name} description={c.description} onClickAdd={openSourceDrawer} />
              ))}
          </div>
        </div>
      </div>

      <ServiceConnectionBuilder
        orgSlugId={orgSlugId}
        workspaceId={workspaceId}
        available={sourceDrawer.isAvailable}
        service={sourceDrawer.name}
        isOpen={sourceDrawer.isOpen}
        editMode={false}
        onClose={onCloseDrawer}
      />
    </div>
  );
};

export default AddDatasource;
