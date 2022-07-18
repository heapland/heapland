import * as React from "react";
import { FaHashtag } from "react-icons/fa";
import { MdOutlineAccessTimeFilled } from "react-icons/md";
import BinaryDataIcon from "./BinaryDataIcon";
import BooleanIcon from "./BooleanIcon";
import DollarIcon from "./DollarIcon";
import GeometryIcon from "./GeometryIcon";
import JsonIcon from "./JsonIcon";
import TextIcon from "./TextIcon";

const ColumnIcon: React.FC<{ dataType: string }> = ({ dataType }) => {
  switch (dataType.toLowerCase()) {
    case "varchar":
    case "text":
    case "char":
      return <TextIcon />;
    case "serial":
    case "bigserial":
    case "bigint":
    case "int8":
    case "int":
    case "int4":
    case "smallint":
    case "integer":
    case "decimal":
    case "numeric":
    case "real":
    case "double precision":
    case "smallserial":
      return <FaHashtag />;
    case "timestamp":
    case "time":
    case "interval":
    case "date":
      return <MdOutlineAccessTimeFilled />;
    case "json":
      return <JsonIcon />;
    case "bool":
      return <BooleanIcon />;
    case "binary":
      return <BinaryDataIcon />;
    case "money":
      return <DollarIcon />;
    case "point":
    case "line":
    case "lseg":
    case "box":
    case "path":
    case "polygon":
    case "circle":
      return <GeometryIcon />;
    default:
      return <></>;
  }
};

export default ColumnIcon;
