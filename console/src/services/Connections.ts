import { message } from "antd";
import { DBQuery, DBSummary, QueryExecutionResult } from "../models/DatabaseBrowser";
import { FailedFileListing, FileListing, FileSummary } from "../models/FileBrowser";
import { Columns, Tables } from "../pages/workspace/DatabaseBrowser/PgSQLCompletionProvider";
import { PubKeyResponse } from "./AuthService";
import { IErrorHandler } from "./IErrorHander";
import { BadConnection, InternalServerError } from "./SparkService";
import WebService, { IHttpResponse } from "./WebService";
import { FailedResponse } from "./Workspace";
const _sodium = require("libsodium-wrappers");

interface OpResult {
  success: boolean;
}

export interface SchemaObjects {
  views: string[];
  tables: string[];
  routines: string[];
}

interface QueryUpdateResult {
  success: number;
}

export interface ConnectionMeta {
  name: string;
  category: string;
  description: string;
}

export interface ConnectionView {
  id: number;
  name: string;
  schemaVersion: string;
  provider: string;
  providerCategory: string;
  dateCreated: number;
}

export interface ColumnDetails {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForegnKey: boolean;
}

export interface PrimaryKey {
  colName: string;
  name: string;
}
export interface ForeignKeys {
  colName: string;
  name: string;
  foreignTable: string;
  foreignCol: string;
}

export interface TableIndex {
  name: string;
  col: string;
}
export interface TableObjects {
  columns: ColumnDetails[];
  primaryKey: PrimaryKey[];
  foreignKeys: ForeignKeys[];
  indexes: TableIndex[];
}
export interface TableMeta {
  [key: string]: {
    columns: ColumnDetails[];
    primaryKeys: PrimaryKey[];
    foreignKeys: ForeignKeys[];
    indexes: TableIndex[];
  };
}

class ConnectionService extends IErrorHandler {
  private webAPI: WebService = new WebService();

  testDBConnection = async (name: string, provider: string, props_str: string, schemaVersion: number) => {
    await _sodium.ready;
    const sodium = _sodium;

    const pubKeyResponse = await this.webAPI.get<PubKeyResponse>(`/web/secrets/pub-key`);
    if (pubKeyResponse.parsedBody) {
      const pubKey = pubKeyResponse.parsedBody.key;

      const pubKeyUint8 = new Uint8Array(Buffer.from(pubKey, "hex"));
      const cipherProps = sodium.crypto_box_seal(props_str, pubKeyUint8, "hex");

      const savedResponse = await this.webAPI.post<DBSummary | BadConnection>(`/web/v1/rdbms/test`, {
        name: name,
        provider: provider,
        encProperties: cipherProps,
        schemaVersion: schemaVersion,
      });

      if (savedResponse.status === 200 && savedResponse.parsedBody) {
        message.success("Connection test successful");
      } else {
        message.error(`Connection test failed with error: ${(savedResponse.parsedBody as BadConnection).error}`);
      }
    }
  };

  saveConnection = async (name: string, provider: string, props_str: string, schemaVersion: number, onSuccess: (id: number) => void) => {
    await _sodium.ready;
    const sodium = _sodium;

    const pubKeyResponse = await this.webAPI.get<PubKeyResponse>(`/web/secrets/pub-key`);
    if (pubKeyResponse.parsedBody) {
      const pubKey = pubKeyResponse.parsedBody.key;

      const pubKeyUint8 = new Uint8Array(Buffer.from(pubKey, "hex"));
      const cipherProps = sodium.crypto_box_seal(props_str, pubKeyUint8, "hex");

      const savedResponse = await this.webAPI.post<{ connectionId: number } | FailedResponse>(`/web/v1/connections`, {
        name: name,
        provider: provider,
        encProperties: cipherProps,
        schemaVersion: schemaVersion,
      });

      if (savedResponse.status === 201 && savedResponse.parsedBody) {
        const creationResult = savedResponse.parsedBody as { connectionId: number };
        onSuccess(creationResult.connectionId);
      } else {
        message.error((savedResponse.parsedBody as FailedResponse).message);
      }
    }
  };

  getConnectionProviders = async (onSuccess: (topic: ConnectionMeta[]) => void) => {
    try {
      const response = this.webAPI.get<ConnectionMeta[] | InternalServerError>(`/web/v1/connection-providers`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as ConnectionMeta[];
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the connections ");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listConnections = async (onSuccess: (connections: ConnectionView[]) => void) => {
    try {
      const response = this.webAPI.get<ConnectionView[] | InternalServerError>(`/web/v1/connections`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as ConnectionView[];
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the connections");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  getDBSummary = async (dbId: number, onSuccess: (summary: DBSummary) => void, onFailure: (message: BadConnection) => void) => {
    try {
      const response = this.webAPI.get<DBSummary | BadConnection>(`/web/v1/rdbms/${dbId}/summary`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as DBSummary;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as BadConnection;
        onFailure(body);
      } else {
        const err = this.getDefaultError("Fetching the connections");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  getTableData = async (dbId: number, table: string, schema: string, onSuccess: (summary: QueryExecutionResult) => void) => {
    try {
      const response = this.webAPI.get<QueryExecutionResult | InternalServerError>(
        `/web/v1/rdbms/${dbId}/schemas/${schema}/tables/${table}/data`
      );

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as QueryExecutionResult;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        // this.showError(body.message);
        message.error(body.message);
      } else {
        const err = this.getDefaultError("Fetching the table data");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listCatalogs = async (dbId: number, onSuccess: (summary: string[]) => void) => {
    try {
      const response = this.webAPI.get<string[] | InternalServerError>(`/web/v1/rdbms/${dbId}/catalogs`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as string[];
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the catalogs");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listSchemas = async (dbId: number, onSuccess: (summary: string[]) => void) => {
    try {
      const response = this.webAPI.get<string[] | InternalServerError>(`/web/v1/rdbms/${dbId}/schemas`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as string[];
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the schemas");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listQueries = async (dbId: number, onSuccess: (queries: DBQuery[]) => void) => {
    try {
      const response = this.webAPI.get<DBQuery[] | InternalServerError>(`/web/v1/rdbms/${dbId}/queries`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as DBQuery[];
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the queries");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  getQuery = async (dbId: number, queryId: number | string, onSuccess: (query: DBQuery) => void) => {
    try {
      const response = this.webAPI.get<DBQuery | InternalServerError>(`/web/v1/rdbms/${dbId}/queries/${queryId}`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as DBQuery;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the queries");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  executeQuery = async (dbId: number, query: string): Promise<IHttpResponse<QueryExecutionResult | InternalServerError>> => {
    const response = this.webAPI.put<QueryExecutionResult | InternalServerError>(`/web/v1/rdbms/${dbId}/execute`, {
      q: query,
    });
    return response;
  };

  addQuery = async (dbId: number, name: string, text: string, onSuccess: (queryId: number) => void) => {
    try {
      const response = this.webAPI.post<{ queryId: number } | InternalServerError>(`/web/v1/rdbms/${dbId}/queries`, {
        name: name,
        text: text,
      });

      const r = await response;
      if (r.status === 201 && r.parsedBody) {
        const result = r.parsedBody as { queryId: number };
        onSuccess(result.queryId);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Save the query");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  updateQuery = async (dbId: number, qId: number | string, name: string, text: string, onSuccess: (res: OpResult) => void) => {
    try {
      const response = this.webAPI.put<OpResult | InternalServerError>(`/web/v1/rdbms/${dbId}/queries/${qId}`, {
        name: name,
        text: text,
      });

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as OpResult;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Save the query");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  deleteQuery = async (dbId: number, qId: number | string, onSuccess: (res: OpResult) => void) => {
    try {
      const response = this.webAPI.delete<OpResult | InternalServerError>(`/web/v1/rdbms/${dbId}/queries/${qId}`, {});

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as OpResult;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Delete the query");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listTablesMeta = async (dbId: number, schema: string, onSuccess: (tables: TableMeta) => void) => {
    try {
      const response = this.webAPI.get<TableMeta | InternalServerError>(`/web/v1/rdbms/${dbId}/schemas/${schema}/tables-meta`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as TableMeta;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the tables meta");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listTables = async (dbId: number, schema: string, productName: string, onSuccess: (tables: string[]) => void) => {
    try {
      let response;
      if (productName.toLowerCase() === "mysql") {
        response = this.webAPI.get<string[] | InternalServerError>(`/web/v1/rdbms/${dbId}/schemas/default/tables`);
      } else {
        response = this.webAPI.get<string[] | InternalServerError>(`/web/v1/rdbms/${dbId}/schemas/${schema}/tables`);
      }
      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as string[];
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the schemas");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listTablesObjects = async (dbId: number, schema: string, table: string, onSuccess: (tables: TableObjects) => void) => {
    try {
      const response = this.webAPI.get<TableObjects | InternalServerError>(
        `/web/v1/rdbms/${dbId}/schemas/${schema}/tables/${table}/describe`
      );

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as TableObjects;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the schemas");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listSchemaObjects = async (dbId: number, schema: string, onSuccess: (schemaObjects: SchemaObjects) => void) => {
    try {
      const response = this.webAPI.get<SchemaObjects | InternalServerError>(`/web/v1/rdbms/${dbId}/schemas/${schema}/objects`);
      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as SchemaObjects;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the schemas");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listRootDirs = async (connectionId: number, onSuccess: (topic: FileListing) => void, OnFailure: (err: FailedFileListing) => void) => {
    try {
      const response = this.webAPI.get<FileListing | FailedFileListing>(`/web/v1/fs/${connectionId}`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as FileListing;
        onSuccess(result);
      } else if (r.status === 400 && r.parsedBody) {
        const body = r.parsedBody as FailedFileListing;
        OnFailure(body);
      } else {
        const err = this.getDefaultError("Fetching the files");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  listFiles = async (
    connectionId: number,
    path: string,
    onSuccess: (topic: FileListing) => void,
    OnFailure: (err: FailedFileListing) => void
  ) => {
    try {
      const response = this.webAPI.get<FileListing | FailedFileListing>(`/web/v1/fs/${connectionId}/path/${path}`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as FileListing;
        onSuccess(result);
      } else if (r.status === 400 && r.parsedBody) {
        const body = r.parsedBody as FailedFileListing;
        OnFailure(body);
      } else {
        const err = this.getDefaultError("Fetching the files");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  getFileSummary = async (
    connectionId: number,
    path: string,
    onSuccess: (summary: FileSummary) => void,
    OnFailure: (err: FailedFileListing) => void
  ) => {
    try {
      const response = this.webAPI.get<FileSummary | FailedFileListing>(`/web/v1/fs/${connectionId}/summary/${path}`);

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as FileSummary;
        onSuccess(result);
      } else if (r.status === 400 && r.parsedBody) {
        const body = r.parsedBody as FailedFileListing;
        OnFailure(body);
      } else {
        const err = this.getDefaultError("Fetching the files");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  deleteConnection = async (connectionId: number, onSuccess: (result: OpResult) => void) => {
    try {
      const response = this.webAPI.delete<OpResult | InternalServerError>(`/web/v1/connections/${connectionId}`, {});

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as OpResult;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Fetching the files");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  createDirectory = async (connectionId: number, path: string, onSuccess: (result: OpResult) => void) => {
    try {
      const response = this.webAPI.put<OpResult | InternalServerError>(`/web/v1/fs/${connectionId}/path/${path}`, {});

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as OpResult;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Create directory");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  deleteFile = async (connectionId: number, path: string, onSuccess: (result: OpResult) => void) => {
    try {
      const response = this.webAPI.delete<OpResult | InternalServerError>(`/web/v1/fs/${connectionId}/path/${path}`, {});

      const r = await response;
      if (r.status === 200 && r.parsedBody) {
        const result = r.parsedBody as OpResult;
        onSuccess(result);
      } else if (r.parsedBody) {
        const body = r.parsedBody as InternalServerError;
        this.showError(body.message);
      } else {
        const err = this.getDefaultError("Delete File");
        this.showError(err.message);
      }
    } catch (e) {}
  };

  updateConnection = async (
    connectionId: number,
    name: string,
    provider: string,
    props_str: string,
    schemaVersion: number,
    onSuccess: (result: OpResult) => void
  ) => {
    await _sodium.ready;
    const sodium = _sodium;

    const pubKeyResponse = await this.webAPI.get<PubKeyResponse>(`/web/secrets/pub-key`);
    if (pubKeyResponse.parsedBody) {
      const pubKey = pubKeyResponse.parsedBody.key;
      console.log(props_str);
      const pubKeyUint8 = new Uint8Array(Buffer.from(pubKey, "hex"));
      const cipherProps = sodium.crypto_box_seal(props_str, pubKeyUint8, "hex");

      const savedResponse = await this.webAPI.put<OpResult | FailedResponse>(`/web/v1/connections/${connectionId}`, {
        name: name,
        provider: provider,
        encProperties: cipherProps,
        schemaVersion: schemaVersion,
      });

      if (savedResponse.status === 200 && savedResponse.parsedBody) {
        const updateResult = savedResponse.parsedBody as OpResult;
        onSuccess(updateResult);
      } else {
        message.error((savedResponse.parsedBody as FailedResponse).message);
      }
    }
  };
}

export default new ConnectionService();
