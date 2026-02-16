import React, { useRef, useState } from "react";
import { useSDK, useAutoResizer } from "@contentful/react-apps-toolkit";
import { Button } from "@contentful/f36-components";

const Sidebar = () => {
  const sdk = useSDK();
  useAutoResizer();

  const savedSnapshot = useRef(null);
  const [canRestore, setCanRestore] = useState(false);

  const handleReset = () => {
    const fields = sdk.entry.fields;
    const snapshot = {};

    Object.keys(fields).forEach((fieldId) => {
      snapshot[fieldId] = fields[fieldId].getValue();
    });

    savedSnapshot.current = snapshot;

    Object.keys(fields).forEach((fieldId) => {
      fields[fieldId].removeValue();
    });

    setCanRestore(true);
    sdk.notifier.success("All field values have been cleared.");
  };

  const handleRestore = () => {
    const fields = sdk.entry.fields;
    const snapshot = savedSnapshot.current;

    if (!snapshot) return;

    Object.keys(snapshot).forEach((fieldId) => {
      if (fields[fieldId] && snapshot[fieldId] !== undefined) {
        fields[fieldId].setValue(snapshot[fieldId]);
      }
    });

    setCanRestore(false);
    sdk.notifier.success("Field values have been restored.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <Button variant="negative" isFullWidth onClick={handleReset}>
        Reset All Fields
      </Button>
      <Button
        variant="secondary"
        isFullWidth
        onClick={handleRestore}
        isDisabled={!canRestore}
      >
        Restore Last Values
      </Button>
    </div>
  );
};

export default Sidebar;
