export interface DBSummary {
  connectionName: string;
  productName: string;
  majorVersion: string;
  minorVersion: string;
  patchVersion: string;
}

export interface DBQuery {
  id: number;
  name: string;
  text: string;
}

export interface QueryExecutionResult {
  columns: { name: string; dataType: string }[];
  result: any[];
  resultSize: number;
}
