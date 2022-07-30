import { CompletionInterface } from "./PgSQL";

export const mySqlDataTypes: CompletionInterface[] = [
  {
    key: "char",
    detail:
      "A FIXED length string (can contain letters, numbers, and special characters). The size parameter specifies the column length in characters - can be from 0 to 255. Default is 1",
    insertText: "char()",
  },
  {
    key: "varchar",
    detail:
      "	A VARIABLE length string (can contain letters, numbers, and special characters). The size parameter specifies the maximum column length in characters - can be from 0 to 65535",
    insertText: "varchar()",
  },
  {
    key: "binary",
    detail: "	Equal to CHAR(), but stores binary byte strings. The size parameter specifies the column length in bytes. Default is 1",
    insertText: "binary()",
  },
  {
    key: "varbinary",
    detail: "	Equal to VARCHAR(), but stores binary byte strings. The size parameter specifies the maximum column length in bytes.",
    insertText: "varbinary()",
  },
  {
    key: "tinyblob",
    detail: "	For BLOBs (Binary Large OBjects). Max length: 255 bytes",
    insertText: "tinyblob",
  },
  {
    key: "tinytext",
    detail: "	Holds a string with a maximum length of 255 characters",
    insertText: "tinytext",
  },
  {
    key: "text",
    detail: "Holds a string with a maximum length of 65,535 bytes",
    insertText: "text()",
  },
  {
    key: "blob",
    detail: "For BLOBs (Binary Large OBjects). Holds up to 65,535 bytes of data",
    insertText: "blob()",
  },
  {
    key: "mediumblob",
    detail: "	For BLOBs (Binary Large OBjects). Holds up to 4,294,967,295 bytes of data",
    insertText: "mediumblob",
  },
  {
    key: "longtext",
    detail: "Holds a string with a maximum length of 4,294,967,295 characters",
    insertText: "longtext",
  },
  {
    key: "enum",
    detail: `
    A string object that can have only one value, chosen from a list of possible values. You can list up to 65535 values in an ENUM list. If a value is inserted that is not in the list, a blank value will be inserted. The values are sorted in the order you enter them
    `,
    insertText: "enum()",
  },
  {
    key: "set",
    detail: `
    A string object that can have 0 or more values, chosen from a list of possible values. You can list up to 64 values in a SET list
    `,
    insertText: "set()",
  },
  {
    key: "bit",
    detail: `
    A bit-value type. The number of bits per value is specified in size. The size parameter can hold a value from 1 to 64. The default value for size is 1.
    `,
    insertText: "bit()",
  },
  {
    key: "tinyint",
    detail:
      "A very small integer. Signed range is from -128 to 127. Unsigned range is from 0 to 255. The size parameter specifies the maximum display width (which is 255)",
    insertText: "tinyint()",
  },
  {
    key: "bool",
    detail: "Zero is considered as false, nonzero values are considered as true.",
    insertText: "bool",
  },
  {
    key: "boolean",
    detail: "Equal to BOOL",
    insertText: "boolean",
  },
  {
    key: "smallint",
    detail:
      "A small integer. Signed range is from -32768 to 32767. Unsigned range is from 0 to 65535. The size parameter specifies the maximum display width (which is 255)",
    insertText: "smallint()",
  },
  {
    key: "mediumint",
    detail: `
    A medium integer. Signed range is from -8388608 to 8388607. Unsigned range is from 0 to 16777215. The size parameter specifies the maximum display width (which is 255)
    `,
    insertText: "mediumint",
  },
  {
    key: "int",
    detail: `
    A medium integer. Signed range is from -2147483648 to 2147483647. Unsigned range is from 0 to 4294967295. The size parameter specifies the maximum display width (which is 255)
    `,
    insertText: "int()",
  },
  {
    key: "integer",
    detail: "Equal to INT(size)",
    insertText: "integer()",
  },
  {
    key: "float",
    detail:
      "	A floating point number. MySQL uses the p value to determine whether to use FLOAT or DOUBLE for the resulting data type. If p is from 0 to 24, the data type becomes FLOAT(). If p is from 25 to 53, the data type becomes DOUBLE()",
    insertText: "float()",
  },
  {
    key: "double",
    detail:
      "	A normal-size floating point number. The total number of digits is specified in size. The number of digits after the decimal point is specified in the d parameter",
    insertText: "double()",
  },
  {
    key: "double precision",
    detail: "",
    insertText: "double precision()",
  },
  {
    key: "decimal",
    detail:
      "	An exact fixed-point number. The total number of digits is specified in size. The number of digits after the decimal point is specified in the d parameter. The maximum number for size is 65. The maximum number for d is 30. The default value for size is 10. The default value for d is 0.",
    insertText: "decimal(size,d)",
  },
  {
    key: "dec",
    detail: "	Equal to DECIMAL(size,d)",
    insertText: "dec()",
  },
  {
    key: "date",
    detail: `
    A date. Format: YYYY-MM-DD. The supported range is from '1000-01-01' to '9999-12-31'
    `,
    insertText: "date",
  },
  {
    key: "datetime",
    detail: `
    A date and time combination. Format: YYYY-MM-DD hh:mm:ss. The supported range is from '1000-01-01 00:00:00' to '9999-12-31 23:59:59'. Adding DEFAULT and ON UPDATE in the column definition to get automatic initialization and updating to the current date and time   
    `,
    insertText: "datetime()",
  },
  {
    key: "timestamp",
    detail: `
    A timestamp. TIMESTAMP values are stored as the number of seconds since the Unix epoch ('1970-01-01 00:00:00' UTC). Format: YYYY-MM-DD hh:mm:ss. The supported range is from '1970-01-01 00:00:01' UTC to '2038-01-09 03:14:07' UTC. Automatic initialization and updating to the current date and time can be specified using DEFAULT CURRENT_TIMESTAMP and ON UPDATE CURRENT_TIMESTAMP in the column definition
    `,
    insertText: "timestamp()",
  },
  {
    key: "time",
    detail: `
    A time. Format: hh:mm:ss. The supported range is from '-838:59:59' to '838:59:59'
    `,
    insertText: "time()",
  },
  {
    key: "year",
    detail: `
A year in four-digit format. Values allowed in four-digit format: 1901 to 2155, and 0000.
MySQL 8.0 does not support year in two-digit format.
    `,

    insertText: "year",
  },
];
