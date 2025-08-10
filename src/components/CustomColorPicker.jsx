import React, { useState, useEffect } from "react";
import { BlockPicker, SketchPicker } from "react-color";

const pickers = {
  BlockPicker,
  SketchPicker,
};

const CustomColorPicker = ({ sdk }) => {
  const [pickerType, setPickerType] = useState("SketchPicker");
  const currentColor = sdk.field.getValue() || "##ffffffff"; // Default to white if no value

    // Helper to parse #RRGGBBAA
    const hexAToRgba = (hex) => {
      if (!/^#([\da-fA-F]{8})$/.test(hex)) return color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const a = parseInt(hex.slice(7, 9), 16) / 255;
      return { r, g, b, a };
    };

  const [color, setColor] = useState(hexAToRgba(currentColor));
  const [inputValue, setInputValue] = useState(currentColor);
  const PickerComponent = pickers[pickerType];

  // Helper to convert RGBA to #RRGGBBAA
  const rgbaToHexA = ({ r, g, b, a }) => {
    const toHex = (v) => v.toString(16).padStart(2, "0");
    const alpha = Math.round(a * 255);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`;
  };

  useEffect(() => {
    setInputValue(rgbaToHexA(color));
  }, [color]);

  const handleChange = (color) => {
    setColor(color);
    sdk.field.setValue(rgbaToHexA(color));
  };

  return (
    <div>
      <div style={{ fontSize: 18, color: "white", marginBottom: 8 }}>
        Choose a picker type:
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 8 }}>
        {Object.keys(pickers).map((type) => (
          <button
            key={type}
            style={{
              margin: 4,
              padding: 8,
              borderRadius: 4,
              border:
                pickerType === type ? "2px solid #007AFF" : "1px solid #ccc",
              background: pickerType === type ? "#e0f0ff" : "#fff",
              cursor: "pointer",
            }}
            onClick={() => setPickerType(type)}
          >
            {type.replace("Picker", "")}
          </button>
        ))}
      </div>
      <PickerComponent
        color={color}
        onChange={(newColor) => handleChange(newColor.rgb)}
      />
      <div style={{ marginBottom: 16, marginTop: 16 }}>
        <div>Hex with Alpha (#RRGGBBAA):</div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (/^#([\da-fA-F]{8})$/.test(e.target.value)) {
              handleChange(hexAToRgba(e.target.value));
            }
          }}
          style={{
            padding: 8,
            fontSize: 16,
            border: "1px solid #ccc",
            borderRadius: 4,
            width: 160,
            marginTop: 4,
          }}
        />
      </div>{" "}
    </div>
  );
};

export default CustomColorPicker;
