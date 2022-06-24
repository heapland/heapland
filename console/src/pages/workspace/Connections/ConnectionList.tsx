import { Alert, Button, Card, Menu, Skeleton, Table, Tag } from "antd";
import Column from "antd/lib/table/Column";
import moment from "moment";
import React, { FC, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { history } from "../../../configureStore";
import Connections, { ConnectionView } from "../../../services/Connections";
import { bytesToSize, getReadableTime, calculatePer, getLocalStorage } from "../../../services/Utils";
import { UserContext } from "../../../store/User";

const EmptyConnectionSection: FC<{ slugId: string; workspaceId: number }> = ({ slugId, workspaceId }) => {
  return (
    <div className='clusters-deploy'>
      <h2 className='header-title'>Add a service</h2>
      <p className='header-desc'>Connect with an object storage to browse files, or a database service to query tables </p>
      <Button
        type='primary'
        className='jobs-deploy-btn btn-action-light'
        onClick={(e) => history.push(`/${slugId}/workspace/${workspaceId}/add-connection`)}>
        Connect Service
      </Button>
    </div>
  );
};

const ConnectionList: FC = () => {
  const context = useContext(UserContext);
  const handleMenuClick = (menuKey: any) => {
    history.push(`/${context.currentUser.profile?.orgSlugId}/workspace/${context.currentUser.profile?.workspaceId}/new-cluster}`);
  };
  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key='sandbox'>Local Sandbox</Menu.Item>
      <Menu.Item key='remote'>Remote Cluster</Menu.Item>
    </Menu>
  );
  const [connectionsState, setConnectionsState] = React.useState<{ loading: boolean; connections: ConnectionView[]; error?: string }>({
    loading: true,
    connections: [],
  });

  useEffect(() => {
    context.currentUser.profile &&
      Connections.listConnections((c) => {
        setConnectionsState({ ...connectionsState, connections: c, loading: false });
      });
  }, []);

  return (
    <div className='workspace-wrapper clusters-container connection-list-wrapper'>
      <Skeleton loading={connectionsState.loading} paragraph={{ rows: 4 }} active>
        {connectionsState.connections.length === 0 && (
          <div>
            {context.currentUser.profile && (
              <EmptyConnectionSection
                slugId={context.currentUser.profile.orgSlugId}
                workspaceId={context.currentUser.profile.workspaceId}
              />
            )}
          </div>
        )}
        {connectionsState.connections.length > 0 && (
          <>
            <Card title='Connections' bordered={false}>
              <Table
                dataSource={connectionsState.connections}
                pagination={false}
                bordered={false}
                className='tbl-cluster connection-list-table'
                rowKey={(record: ConnectionView) => record.id}>
                <Column
                  title='NAME'
                  className='project-name table-cell-light'
                  dataIndex=''
                  render={(v: ConnectionView) => (
                    <div>
                      {context.currentUser.profile && (
                        <Link
                          to={`/${context.currentUser.profile.orgSlugId}/workspace/${context.currentUser.profile.workspaceId}/${v.providerCategory}/${v.id}`}>
                          {v.name}
                        </Link>
                      )}
                    </div>
                  )}
                />

                <Column
                  title='PROVIDER'
                  dataIndex=''
                  className='run-history-col table-cell-light'
                  render={(v: ConnectionView) => {
                    return (
                      <Tag color='geekblue' className=''>
                        {v.provider}
                      </Tag>
                    );
                  }}
                />
                <Column
                  title='SERVICE'
                  dataIndex=''
                  className='run-history-col table-cell-light'
                  render={(c: ConnectionView) => (
                    <div>
                      <span className='config-key'>{c.providerCategory}</span>
                      <span className='config-val'>{c.provider}</span>
                    </div>
                  )}
                />

                <Column
                  title='CREATED'
                  dataIndex=''
                  render={(c: ConnectionView) => <span>{moment(c.dateCreated * 1000).fromNow()}</span>}
                  className='run-history-col table-cell-light'
                />
              </Table>
            </Card>
          </>
        )}
        {connectionsState.error && <Alert showIcon style={{ marginTop: 20 }} type='warning' message={connectionsState.error} />}
      </Skeleton>
    </div>
  );
};

export default ConnectionList;
