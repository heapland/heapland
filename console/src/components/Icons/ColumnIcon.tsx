import * as React from "react";
import { FaHashtag } from "react-icons/fa";
import { GoKey } from "react-icons/go";
import { Md24Mp, MdOutlineAccessTimeFilled } from "react-icons/md";
import BinaryDataIcon from "./BinaryDataIcon";
import BooleanIcon from "./BooleanIcon";
import DollarIcon from "./DollarIcon";
import GeometryIcon from "./GeometryIcon";
import JsonIcon from "./JsonIcon";
import TextIcon from "./TextIcon";

const ColumnIcon: React.FC<{ dataType: string }> = ({ dataType }) => {
  // console.log(dataType);
  switch (dataType?.toLowerCase()) {
    case "varchar":
    case "text":
    case "char":
    case "list<text>":
      return <TextIcon />;
    case "uuid":
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
    case "double":
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
    case "circle":
      return <GeometryIcon />;
    case "keyicon":
      return <GoKey />;
    default:
      return <Md24Mp />;
  }
};

export default ColumnIcon;
