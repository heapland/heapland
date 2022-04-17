import { Card, Tag } from "antd";
import React, { FC, useEffect, useState } from "react";
import { CloudCluster, ClusterProvider, WorkspaceApiKey } from "../../../services/Workspace";

import WorkspaceService from "../../../services/Workspace";
import { FormInstance } from "antd/lib/form";
import { ConnectionConfig } from "../../../components/connections/ConnectionConfig";
import { S3Connection } from "../../../components/connections/S3Connection";
import { PgConnection } from "../../../components/connections/PostgresConnection";
import { MySQLConnection } from "../../../components/connections/MySQLConnection";
import { KafkaConnection } from "../../../components/connections/KafkaConnection";
import { CassandraConnection } from "../../../components/connections/CassandraConnection";

export const AddConnectionProvider: FC<{
  service: string;
  connectionForm: FormInstance;
  onConnectionSave?: (conn: ConnectionConfig) => void;
}> = ({ service, connectionForm, onConnectionSave }) => {
  const [providerForm, setProvider] = useState(false);
  const [processing, setProcessing] = useState<{
    isProcessing: boolean;
    isSaving: boolean;
    notifyBtnLoading: boolean;
    keys: WorkspaceApiKey[];
    clusters: CloudCluster[];
    errorMessage?: string;
  }>({
    isProcessing: false,
    isSaving: false,
    notifyBtnLoading: false,
    clusters: [],
    keys: [],
  });

  useEffect(() => {
    WorkspaceService.getWorkspaceKeys((keys) => {
      setProcessing({ ...processing, keys: keys });
    });
  }, []);

  const onClose = () => {
    setProvider(false);
  };

  return (
    <>
      <div style={{ padding: "10px" }}>
        {service === "s3" && <S3Connection />}
        {service === "postgresql" && <PgConnection />}
        {service === "mysql" && <MySQLConnection />}
        {service === "mariadb" && <MySQLConnection />}
        {service === "kafka" && <KafkaConnection />}
        {service === "cassandra" && <CassandraConnection />}
      </div>
    </>
  );
};
