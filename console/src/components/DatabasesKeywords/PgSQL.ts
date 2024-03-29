export interface CompletionInterface {
  key: string;
  detail: string;
  insertText?: string;
}

export const pgsql_operators: string[] = [
  // Logical
  "ALL",
  "AND",
  "ANY",
  "BETWEEN",
  "EXISTS",
  "IN",
  "LIKE",
  "NOT",
  "OR",
  "SOME",
  // Set
  "EXCEPT",
  "INTERSECT",
  "UNION",
  // Join
  "APPLY",
  "CROSS",
  "FULL",
  "INNER",
  "JOIN",
  "LEFT",
  "OUTER",
  "RIGHT",
  // Predicates
  "CONTAINS",
  "FREETEXT",
  "IS",
  "NULL",
  // Pivoting
  "PIVOT",
  "UNPIVOT",
  // Merging
  "MATCHED",
];

export const pgsql_builtinVariables: string[] = [
  // Configuration
  "@@DATEFIRST",
  "@@DBTS",
  "@@LANGID",
  "@@LANGUAGE",
  "@@LOCK_TIMEOUT",
  "@@MAX_CONNECTIONS",
  "@@MAX_PRECISION",
  "@@NESTLEVEL",
  "@@OPTIONS",
  "@@REMSERVER",
  "@@SERVERNAME",
  "@@SERVICENAME",
  "@@SPID",
  "@@TEXTSIZE",
  "@@VERSION",
  // Cursor
  "@@CURSOR_ROWS",
  "@@FETCH_STATUS",
  // Datetime
  "@@DATEFIRST",
  // Metadata
  "@@PROCID",
  // System
  "@@ERROR",
  "@@IDENTITY",
  "@@ROWCOUNT",
  "@@TRANCOUNT",
  // Stats
  "@@CONNECTIONS",
  "@@CPU_BUSY",
  "@@IDLE",
  "@@IO_BUSY",
  "@@PACKET_ERRORS",
  "@@PACK_RECEIVED",
  "@@PACK_SENT",
  "@@TIMETICKS",
  "@@TOTAL_ERRORS",
  "@@TOTAL_READ",
  "@@TOTAL_WRITE",
];

export const pgsql_typeKeywords: string[] = [
  "bool",
  "byte",
  "ubyte",
  "short",
  "ushort",
  "int",
  "uint",
  "long",
  "ulong",
  "char",
  "wchar",
  "dchar",
  "float",
  "double",
  "real",
  "ifloat",
  "idouble",
  "ireal",
  "cfloat",
  "cdouble",
  "creal",
  "void",
];

export const pgsqlFunction: CompletionInterface[] = [
  {
    key: "AVG",
    detail: "Returns the average value",
    insertText: "AVG()",
  },
  {
    key: "COUNT",
    detail: "Returns the number of rows",
    insertText: "COUNT()",
  },
  {
    key: "FIRST",
    detail: "Returns the first value",
    insertText: "FIRST()",
  },
  {
    key: "LAST",
    detail: "Returns the last value",
    insertText: "LAST()",
  },
  {
    key: "MAX",
    detail: "Returns the largest value",
    insertText: "MAX()",
  },
  {
    key: "MIN",
    detail: "Returns the smallest value",
    insertText: "MIN()",
  },
  {
    key: "SUM",
    detail: "Returns the sum",
    insertText: "SUM()",
  },
  {
    key: "UCASE",
    detail: "Converts a field to upper case",
    insertText: "UCASE()",
  },
  {
    key: "LCASE",
    detail: "Converts a field to lower case",
    insertText: "LCASE()",
  },
  {
    key: "MID",
    detail: "Extract characters from a text field",
    insertText: "()",
  },
  {
    key: "LEN",
    detail: "Returns the length of a text field",
    insertText: "LEN()",
  },
  {
    key: "ROUND",
    detail: "Rounds a numeric field to the number of decimals specified",
    insertText: "ROUND()",
  },
  {
    key: "NOW",
    detail: "Returns the current system date and time",
    insertText: "NOW()",
  },
  {
    key: "FORMAT",
    detail: " Formats how a field is to be displayed",
    insertText: "FORMAT()",
  },
];

export const pgsqlKeywords: CompletionInterface[] = [
  {
    key: "ADD",
    detail: "Adds a column in an existing table",
  },
  {
    key: "ADD CONSTRAINT",
    detail: "Adds a constraint after a table is already created",
  },
  {
    key: "ALL",
    detail: "	Returns true if all of the subquery values meet the condition",
  },
  {
    key: "ALTER",
    detail: "Adds, deletes, or modifies columns in a table, or changes the data type of a column in a table",
  },
  {
    key: "AND",
    detail: "	Only includes rows where both conditions is true",
  },
  {
    key: "BACKUP DATABASE",
    detail: "Creates a back up of an existing database",
  },
  {
    key: "BETWEEN",
    detail: "Selects values within a given range",
  },
  {
    key: "CASE",
    detail: "	Creates different outputs based on conditions",
  },
  {
    key: "CHECK",
    detail: "A constraint that limits the value that can be placed in a column",
  },
  {
    key: "COLUMN",
    detail: "	Changes the data type of a column or deletes a column in a table",
  },
  {
    key: "CONSTRAINT",
    detail: "Adds or deletes a constraint",
  },
  {
    key: "CREATE",
    detail: "Creates a database, index, view, table, or procedure",
  },
  {
    key: "CREATE DATABASE",
    detail: "Creates a new SQL database",
  },
  {
    key: "CREATE INDEX",
    detail: "Creates an index on a table (allows duplicate values)",
  },
  {
    key: "CREATE OR REPLACE VIEW",
    detail: "Updates a view",
  },
  {
    key: "CREATE TABLE",
    detail: "Creates a new table in the database",
  },
  {
    key: "CREATE PROCEDURE",
    detail: "	Creates a stored procedure",
  },
  {
    key: "CREATE UNIQUE INDEX",
    detail: "	Creates a unique index on a table (no duplicate values)",
  },
  {
    key: "CREATE VIEW",
    detail: "Creates a view based on the result set of a SELECT statement",
  },
  {
    key: "DATABASE",
    detail: "Creates or deletes an SQL database",
  },
  {
    key: "DEFAULT",
    detail: "A constraint that provides a default value for a colum",
  },
  {
    key: "DELETE",
    detail: "Deletes rows from a table",
  },
  {
    key: "DESC",
    detail: "	Sorts the result set in detailending order",
  },
  {
    key: "DISTINCT",
    detail: "Selects only distinct (different) values",
  },
  {
    key: "SELECT",
    detail: "Selects only distinct (different) values",
  },
  {
    key: "FROM",
    detail: "Specifies which table to select or delete data from",
  },
  {
    key: "WHERE",
    detail: "Filters a result set to include only records that fulfill a specified condition",
  },
  {
    key: "INSERT",
    detail: "	Inserts new rows in a table",
  },
  {
    key: "DROP",
    detail: "Deletes a column, constraint, database, index, table, or view",
  },
  {
    key: "DROP COLUMN",
    detail: "Deletes a column in a table",
  },
  {
    key: "DROP CONSTRAINT",
    detail: "Deletes a UNIQUE, PRIMARY KEY, FOREIGN KEY, or CHECK constraint",
  },
  {
    key: "DROP DATABASE",
    detail: "Deletes an existing SQL database",
  },
  {
    key: "DROP DEFAULT",
    detail: "Deletes a DEFAULT constraint",
  },
  {
    key: "DROP INDEX",
    detail: "Deletes an index in a table",
  },
  {
    key: "DROP TABLE",
    detail: "	Deletes an existing table in the database",
  },
  {
    key: "DROP VIEW",
    detail: "Deletes a view",
  },
  {
    key: "EXEC",
    detail: "Executes a stored procedure",
  },
  {
    key: "EXISTS",
    detail: "Tests for the existence of any record in a subquery",
  },
  {
    key: "FOREIGN KEY",
    detail: "A constraint that is a key used to link two tables together",
  },
  {
    key: "FULL OUTER JOIN",
    detail: "Returns all rows when there is a match in either left table or right table",
  },
  {
    key: "GROUP BY",
    detail: "Groups the result set (used with aggregate functions: COUNT, MAX, MIN, SUM, AVG)",
  },
  {
    key: "HAVING",
    detail: "Used instead of WHERE with aggregate functions",
  },
  {
    key: "IN",
    detail: "Allows you to specify multiple values in a WHERE clause",
  },
  {
    key: "INDEX",
    detail: "Creates or deletes an index in a table",
  },
  {
    key: "INNER JOIN",
    detail: "Returns rows that have matching values in both tables",
  },
  {
    key: "INSERT INTO SELECT",
    detail: "	Copies data from one table into another table",
  },
  {
    key: "IS NULL",
    detail: "Tests for empty values",
  },
  {
    key: "IS NOT NULL",
    detail: "	Tests for non-empty values",
  },
  {
    key: "NOT NULL",
    detail: "for non-empty values",
  },
  {
    key: "JOIN",
    detail: "Joins tables",
  },
  {
    key: "INTO",
    detail: "",
  },
  {
    key: "TYPE",
    detail: "",
  },
];

export const pgsqlSnippet: CompletionInterface[] = [
  {
    key: "col",
    detail: "new column definitioin",
    insertText: "col int not null",
  },
  {
    key: "del",
    detail: "delete rows from a table",
    insertText: "delete from [table_name] where [condition];",
  },
  {
    key: "ins",
    detail: "insert rows into table",
    insertText: "insert into  () values ();",
  },
  {
    key: "lim",
    detail: "select first N rows from a table",
    insertText: "select * from limit ;",
  },
  {
    key: "sel",
    detail: "select all rows from a table",
    insertText: "select * from ;",
  },
  {
    key: "selc",
    detail: "select the number of specific rows in a table",
    insertText: "select count(*) from alias where alias.;",
  },
  {
    key: "selw",
    detail: "select specific rows from a table",
    insertText: "select * from alias where alias.;",
  },
  {
    key: "tab",
    detail: "new table definition",
    insertText: `create table new_table
(    
  col int not null
);
`,
  },
  {
    key: "upd",
    detail: "update values in  a table",
    insertText: "update set where;",
  },
  {
    key: "view",
    detail: "new view definition",
    insertText: `create view new_view as
select * 
from ;
    `,
  },
];

export const pgsqlDataTypes: CompletionInterface[] = [
  {
    key: "Boolean",
    detail:
      "In PostgreSQL, the “bool” or”boolean” keyword is used to initialize a Boolean data type. These data types can hold true, false, and null values. A boolean data type is stored in the database according to the following:",
    insertText: "Boolean",
  },
  {
    key: "Character",
    detail: "PostgreSQL has three character data types namely, CHAR(n), VARCHAR(n), and TEXT.",
    insertText: "Character",
  },
  {
    key: "Numeric",
    detail: "PostgreSQL has 2 types of numbers namely, integers and floating-point numbers.",
    insertText: "Numeric ",
  },
  {
    key: "Temporal",
    detail: `This data type is used to store date-time data. PostgreSQL has 5 temporal data type: 
DATE is used to store the dates only.
TIME is used to stores the time of day values.
TIMESTAMP is used to stores both date and time values.
TIMESTAMPTZ is used to store a timezone-aware timestamp data type.
INTERVAL is used to store periods of time.
    `,
    insertText: "Temporal ",
  },
  {
    key: "UUID",
    detail:
      "The UUID data type allows you to store Universal Unique Identifiers defined by RFC 4122. The UUID values guarantee a better uniqueness than SERIAL and can be used to hide sensitive data exposed to the public such as values of id in URL. ",
    insertText: "UUID",
  },
  {
    key: "Array ",
    detail:
      "In PostgreSQL, an array column can be used to store an array of strings or an array of integers etc. It can be handy when storing data likes storing days of months, a year, or even a week, etc. ",
    insertText: "Array ",
  },
  {
    key: "JSON ",
    detail:
      "PostgreSQL supports 2 types of JSON types namely JSON and JSONB(Binary JSON). The JSON data type is used to store plain JSON data that get parsed every time it’s called by a query. Whereas the JSONB data type is used to store JSON data in a binary format. It is one hand makes querying data faster whereas slows down the data insertion process as it supports indexing of table data.",
    insertText: "JSON ",
  },
  {
    key: "hstore ",
    detail: "",
    insertText: "hstore ",
  },
  {
    key: "Special ",
    detail: "",
    insertText: "Special ",
  },
];
