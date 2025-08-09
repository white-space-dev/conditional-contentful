import React from "react";
import { SketchPicker } from "react-color";

const CustomColorPicker = ({ sdk }) => {
  const currentColor = sdk.field.getValue() || "#FFFFFF"; // Default to white if no value

  const handleChange = (color) => {
    sdk.field.setValue(color.hex);
  };

  return (
    <div>
      <p>--- Custom Color Picker is here ---</p>
      <SketchPicker color={currentColor} onChange={handleChange} />
    </div>
  );
};

export default CustomColorPicker;
