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
  console.log(dataType);
  switch (dataType) {
    case "varchar":
    case "text":
      return <TextIcon />;
    case "serial":
    case "bigserial":
    case "int8":
    case "int4":
      return <FaHashtag />;
    case "timestamp":
    case "date":
      return <MdOutlineAccessTimeFilled />;
    case "json":
      return <JsonIcon />;
    default:
      return <></>;
  }
};

export default ColumnIcon;
