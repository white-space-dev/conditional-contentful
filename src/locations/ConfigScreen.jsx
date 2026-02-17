import React, { useState, useEffect, useCallback } from "react";
import {
  Heading,
  Paragraph,
  FormControl,
  TextInput,
  Textarea,
  Button,
  Select,
  Table,
  Checkbox,
  Subheading,
  Note,
  Badge,
} from "@contentful/f36-components";
import { useCMA, useSDK } from "@contentful/react-apps-toolkit";

const ConfigScreen = () => {
  const cma = useCMA();
  const sdk = useSDK();
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState("");
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(undefined);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [value, setValue] = useState("");
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [rules, setRules] = useState([]);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [helpTextRules, setHelpTextRules] = useState([]);
  const [helpTextContentType, setHelpTextContentType] = useState("");
  const [helpTextFields, setHelpTextFields] = useState([]);
  const [helpTextControllingField, setHelpTextControllingField] =
    useState(undefined);
  const [helpTextEditingFieldId, setHelpTextEditingFieldId] = useState(null);
  const [helpTextValue, setHelpTextValue] = useState("");
  const [helpTextTargetField, setHelpTextTargetField] = useState("");
  const [helpTextContent, setHelpTextContent] = useState("");
  const [editingHelpTextIndex, setEditingHelpTextIndex] = useState(null);
  const [showHelpTextForm, setShowHelpTextForm] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [selectedRuleIndices, setSelectedRuleIndices] = useState([]);
  const [selectedHelpTextIndices, setSelectedHelpTextIndices] = useState([]);

  const onConfigure = useCallback(async () => {
    const parameters = await sdk.app.getParameters();
    if (parameters) {
      if (parameters.rules) {
        setRules(JSON.parse(parameters.rules));
      }
      if (parameters.helpTextRules) {
        setHelpTextRules(JSON.parse(parameters.helpTextRules));
      }
      if (parameters.contentTypeId) {
        setSelectedContentType(parameters.contentTypeId);
      }
    }
    sdk.app.setReady();
  }, [sdk.app]);

  useEffect(() => {
    onConfigure();
  }, [onConfigure]);

  useEffect(() => {
    const fetchContentTypes = async () => {
      const contentTypes = await cma.contentType.getMany({});
      setContentTypes(contentTypes.items);
    };
    fetchContentTypes();
  }, [cma]);

  useEffect(() => {
    if (selectedContentType) {
      const fetchFields = async () => {
        const contentType = await cma.contentType.get({
          contentTypeId: selectedContentType,
        });
        setFields(contentType.fields);
      };
      fetchFields();
    }
  }, [cma, selectedContentType]);

  useEffect(() => {
    if (helpTextContentType) {
      const fetchFields = async () => {
        const contentType = await cma.contentType.get({
          contentTypeId: helpTextContentType,
        });
        setHelpTextFields(contentType.fields);
      };
      fetchFields();
    }
  }, [cma, helpTextContentType]);

  useEffect(() => {
    if (editingFieldId && fields.length > 0) {
      const field = fields.find((f) => f.id === editingFieldId);
      if (field) {
        setSelectedField(field);
        setEditingFieldId(null);
      }
    }
  }, [fields, editingFieldId]);

  useEffect(() => {
    if (helpTextEditingFieldId && helpTextFields.length > 0) {
      const field = helpTextFields.find((f) => f.id === helpTextEditingFieldId);
      if (field) {
        setHelpTextControllingField(field);
        setHelpTextEditingFieldId(null);
      }
    }
  }, [helpTextFields, helpTextEditingFieldId]);

  // Validation function
  const validateBeforeSave = () => {
    // Validate rules
    for (const rule of rules) {
      if (
        !rule.contentType ||
        !rule.conditions[0]?.field ||
        !rule.conditions[0]?.value ||
        rule.targets.length === 0
      ) {
        return "All rule fields must be filled. Please check your Show/Hide Rules.";
      }
    }

    // Validate help text rules
    for (const helpText of helpTextRules) {
      if (
        !helpText.contentType ||
        !helpText.conditions[0]?.field ||
        !helpText.conditions[0]?.value ||
        !helpText.targetField ||
        !helpText.helpText
      ) {
        return "All help text fields must be filled. Please check your Help Text Rules.";
      }
    }

    return null;
  };

  const handleSaveRule = () => {
    if (
      !selectedContentType ||
      !selectedField ||
      !value ||
      selectedTargets.length === 0
    ) {
      setValidationError("Please fill in all fields before saving the rule.");
      return;
    }

    const newRule = {
      contentType: selectedContentType,
      conditions: [{ field: selectedField.id, operator: "eq", value }],
      targets: selectedTargets,
      logic: "all",
      enabled:
        editingRuleIndex !== null ? rules[editingRuleIndex].enabled : true,
    };

    if (editingRuleIndex !== null) {
      const newRules = [...rules];
      newRules[editingRuleIndex] = newRule;
      setRules(newRules);
      setEditingRuleIndex(null);
    } else {
      setRules([...rules, newRule]);
    }
    setShowForm(false);
    setValidationError("");
    resetRuleForm();
  };

  const handleStartEdit = (rule, index) => {
    setEditingRuleIndex(index);
    setSelectedContentType(rule.contentType);
    setEditingFieldId(rule.conditions[0].field);
    setValue(rule.conditions[0].value);
    setSelectedTargets(rule.targets);
    setShowForm(true);
    setShowHelpTextForm(false);
  };

  const handleDeleteRule = (index) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
    setSelectedRuleIndices(
      selectedRuleIndices
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i)),
    );
  };

  const handleCancelEdit = () => {
    setEditingRuleIndex(null);
    resetRuleForm();
    setShowForm(false);
    setValidationError("");
  };

  const resetRuleForm = () => {
    setSelectedContentType("");
    setSelectedField(undefined);
    setValue("");
    setSelectedTargets([]);
  };

  // Help Text handlers
  const handleSaveHelpText = () => {
    if (
      !helpTextContentType ||
      !helpTextControllingField ||
      !helpTextValue ||
      !helpTextTargetField ||
      !helpTextContent
    ) {
      setValidationError(
        "Please fill in all fields before saving the help text.",
      );
      return;
    }

    const newHelpTextRule = {
      contentType: helpTextContentType,
      conditions: [
        {
          field: helpTextControllingField.id,
          operator: "eq",
          value: helpTextValue,
        },
      ],
      targetField: helpTextTargetField,
      helpText: helpTextContent,
      logic: "all",
      enabled:
        editingHelpTextIndex !== null
          ? helpTextRules[editingHelpTextIndex].enabled
          : true,
    };

    if (editingHelpTextIndex !== null) {
      const newHelpTextRules = [...helpTextRules];
      newHelpTextRules[editingHelpTextIndex] = newHelpTextRule;
      setHelpTextRules(newHelpTextRules);
      setEditingHelpTextIndex(null);
    } else {
      setHelpTextRules([...helpTextRules, newHelpTextRule]);
    }
    setShowHelpTextForm(false);
    setValidationError("");
    resetHelpTextForm();
  };

  const handleStartEditHelpText = (helpTextRule, index) => {
    setEditingHelpTextIndex(index);
    setHelpTextContentType(helpTextRule.contentType);
    setHelpTextEditingFieldId(helpTextRule.conditions[0].field);
    setHelpTextValue(helpTextRule.conditions[0].value);
    setHelpTextTargetField(helpTextRule.targetField);
    setHelpTextContent(helpTextRule.helpText);
    setShowHelpTextForm(true);
    setShowForm(false);
  };

  const handleDeleteHelpText = (index) => {
    const newHelpTextRules = [...helpTextRules];
    newHelpTextRules.splice(index, 1);
    setHelpTextRules(newHelpTextRules);
    setSelectedHelpTextIndices(
      selectedHelpTextIndices
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i)),
    );
  };

  const handleCancelEditHelpText = () => {
    setEditingHelpTextIndex(null);
    resetHelpTextForm();
    setShowHelpTextForm(false);
    setValidationError("");
  };

  const resetHelpTextForm = () => {
    setHelpTextContentType("");
    setHelpTextControllingField(undefined);
    setHelpTextValue("");
    setHelpTextTargetField("");
    setHelpTextContent("");
  };

  const toggleRuleEnabled = (index) => {
    const updated = [...rules];
    updated[index] = {
      ...updated[index],
      enabled: !(updated[index].enabled !== false),
    };
    setRules(updated);
  };

  const toggleSelectedRulesEnabled = (enable) => {
    const updated = [...rules];
    selectedRuleIndices.forEach((i) => {
      updated[i] = { ...updated[i], enabled: enable };
    });
    setRules(updated);
    setSelectedRuleIndices([]);
  };

  const toggleHelpTextEnabled = (index) => {
    const updated = [...helpTextRules];
    updated[index] = {
      ...updated[index],
      enabled: !(updated[index].enabled !== false),
    };
    setHelpTextRules(updated);
  };

  const toggleSelectedHelpTextsEnabled = (enable) => {
    const updated = [...helpTextRules];
    selectedHelpTextIndices.forEach((i) => {
      updated[i] = { ...updated[i], enabled: enable };
    });
    setHelpTextRules(updated);
    setSelectedHelpTextIndices([]);
  };

  const showEmptyForm = () => {
    resetRuleForm();
    setShowForm(true);
    setShowHelpTextForm(false);
    setValidationError("");
  };

  const showEmptyHelpTextForm = () => {
    resetHelpTextForm();
    setShowHelpTextForm(true);
    setShowForm(false);
    setValidationError("");
  };

  useEffect(() => {
    sdk.app.onConfigure(async () => {
      const currentState = await sdk.app.getCurrentState();

      // Validate before saving
      const error = validateBeforeSave();
      if (error) {
        setValidationError(error);
        return false; // Prevent save
      }

      // Collect all content types that have rules or help text rules.
      const contentTypesWithRules = new Set();
      rules.forEach((rule) => {
        if (rule.contentType) contentTypesWithRules.add(rule.contentType);
      });
      helpTextRules.forEach((rule) => {
        if (rule.contentType) contentTypesWithRules.add(rule.contentType);
      });

      // Build EditorInterface: assign EntryEditor for content types with rules.
      const editorInterface = { ...currentState?.EditorInterface };
      contentTypesWithRules.forEach((ctId) => {
        editorInterface[ctId] = {
          ...editorInterface[ctId],
          editor: true,
          sidebar: { position: 0 },
        };
      });

      return {
        parameters: {
          rules: JSON.stringify(rules),
          helpTextRules: JSON.stringify(helpTextRules),
          contentTypeId: selectedContentType,
        },
        targetState: { EditorInterface: editorInterface },
      };
    });
  }, [sdk.app, rules, helpTextRules, selectedContentType]);

  const valueOptions =
    selectedField?.items?.validations?.find((v) => v.in)?.in ||
    selectedField?.validations?.find((v) => v.in)?.in ||
    [];

  const helpTextValueOptions =
    helpTextControllingField?.items?.validations?.find((v) => v.in)?.in ||
    helpTextControllingField?.validations?.find((v) => v.in)?.in ||
    [];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 32px" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0059C8 0%, #0070E0 100%)",
          borderRadius: "8px",
          padding: "24px 32px",
          marginBottom: "32px",
          color: "#fff",
        }}
      >
        <Heading style={{ color: "#fff", marginBottom: "8px" }}>
          Conditional Fields
        </Heading>
        <Paragraph style={{ color: "rgba(255,255,255,0.85)", marginBottom: 0 }}>
          Configure rules to conditionally hide fields and display help text
          based on field values.
        </Paragraph>
      </div>

      {validationError && (
        <Note variant="negative" style={{ marginBottom: "24px" }}>
          {validationError}
        </Note>
      )}

      {/* ── Hide Rules Section ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E5E5E5",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Subheading marginBottom="none">Hide Rules</Subheading>
            <Badge variant="secondary">{rules.length}</Badge>
          </div>
          <Button
            variant="primary"
            size="small"
            onClick={() => showEmptyForm()}
          >
            + Add Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              color: "#8091A5",
              background: "#F7F9FA",
              borderRadius: "6px",
            }}
          >
            <Paragraph style={{ color: "#8091A5", marginBottom: 0 }}>
              No hide rules configured yet. Click "Add Rule" to get started.
            </Paragraph>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <Table>
              <Table.Head style={{ background: "#F7F9FA" }}>
                <Table.Row>
                  <Table.Cell style={{ width: "40px" }}>
                    <Checkbox
                      isChecked={
                        selectedRuleIndices.length === rules.length &&
                        rules.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRuleIndices(rules.map((_, i) => i));
                        } else {
                          setSelectedRuleIndices([]);
                        }
                      }}
                    />
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Content Type
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Controlling Field
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Value
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Target Fields
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Status
                  </Table.Cell>
                  <Table.Cell
                    style={{
                      fontWeight: 600,
                      color: "#536171",
                      width: "140px",
                    }}
                  >
                    Actions
                  </Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {rules.map((rule, index) => (
                  <Table.Row
                    key={index}
                    style={{ opacity: rule.enabled === false ? 0.5 : 1 }}
                  >
                    <Table.Cell>
                      <Checkbox
                        isChecked={selectedRuleIndices.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRuleIndices([
                              ...selectedRuleIndices,
                              index,
                            ]);
                          } else {
                            setSelectedRuleIndices(
                              selectedRuleIndices.filter((i) => i !== index),
                            );
                          }
                        }}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {
                        contentTypes.find(
                          (ct) => ct.sys.id === rule.contentType,
                        )?.name
                      }
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="primary">
                        {rule.conditions[0].field}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="warning">
                        {rule.conditions[0].value}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        {rule.targets.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        variant={
                          rule.enabled !== false ? "positive" : "negative"
                        }
                      >
                        {rule.enabled !== false ? "Enabled" : "Disabled"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          size="small"
                          variant={
                            rule.enabled !== false ? "negative" : "positive"
                          }
                          onClick={() => toggleRuleEnabled(index)}
                        >
                          {rule.enabled !== false ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => handleStartEdit(rule, index)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="negative"
                          onClick={() => handleDeleteRule(index)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
        {selectedRuleIndices.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              background: "#EBF5FF",
              borderRadius: "4px",
              marginTop: "8px",
            }}
          >
            <Paragraph style={{ marginBottom: 0, fontSize: "14px" }}>
              {selectedRuleIndices.length} rule(s) selected
            </Paragraph>
            <Button
              size="small"
              variant="positive"
              onClick={() => toggleSelectedRulesEnabled(true)}
            >
              Enable Selected
            </Button>
            <Button
              size="small"
              variant="negative"
              onClick={() => toggleSelectedRulesEnabled(false)}
            >
              Disable Selected
            </Button>
          </div>
        )}

        {showForm && (
          <div
            style={{
              marginTop: "20px",
              padding: "24px",
              background: "#F7F9FA",
              border: "1px solid #D3DAE6",
              borderRadius: "6px",
            }}
          >
            <Subheading style={{ marginBottom: "16px" }}>
              {editingRuleIndex !== null ? "Edit Hide Rule" : "Add Hide Rule"}
            </Subheading>
            <div style={{ display: "flex", gap: "16px" }}>
              <FormControl style={{ flex: 1 }}>
                <FormControl.Label>Content Type</FormControl.Label>
                <Select
                  value={selectedContentType}
                  onChange={(e) => setSelectedContentType(e.target.value)}
                >
                  <Select.Option value="">Select a content type</Select.Option>
                  {contentTypes.map((contentType) => (
                    <Select.Option
                      key={contentType.sys.id}
                      value={contentType.sys.id}
                    >
                      {contentType.name}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl style={{ flex: 1 }}>
                <FormControl.Label>Field to watch</FormControl.Label>
                <Select
                  value={selectedField?.id}
                  onChange={(e) => {
                    const field = fields.find((f) => f.id === e.target.value);
                    setSelectedField(field);
                  }}
                >
                  <Select.Option value="">Select a field</Select.Option>
                  {fields.map((field) => (
                    <Select.Option key={field.id} value={field.id}>
                      {field.name}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl style={{ flex: 1 }}>
                <FormControl.Label>Value to match</FormControl.Label>
                {valueOptions.length > 0 ? (
                  <Select
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  >
                    <Select.Option value="">Select a value</Select.Option>
                    {valueOptions.map((option) => (
                      <Select.Option key={option} value={option}>
                        {option}
                      </Select.Option>
                    ))}
                  </Select>
                ) : (
                  <TextInput
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter value to match"
                  />
                )}
              </FormControl>
            </div>
            <FormControl>
              <FormControl.Label>Fields to hide</FormControl.Label>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}
              >
                {fields.map((field) => (
                  <Checkbox
                    key={field.id}
                    id={field.id}
                    isChecked={selectedTargets.includes(field.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTargets([...selectedTargets, field.id]);
                      } else {
                        setSelectedTargets(
                          selectedTargets.filter((id) => id !== field.id),
                        );
                      }
                    }}
                  >
                    {field.name}
                  </Checkbox>
                ))}
              </div>
            </FormControl>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <Button variant="primary" onClick={handleSaveRule}>
                {editingRuleIndex !== null ? "Update Rule" : "Save Rule"}
              </Button>
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Help Text Rules Section ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E5E5E5",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Subheading marginBottom="none">Help Text Rules</Subheading>
            <Badge variant="secondary">{helpTextRules.length}</Badge>
          </div>
          <Button
            variant="primary"
            size="small"
            onClick={() => showEmptyHelpTextForm()}
          >
            + Add Help Text
          </Button>
        </div>

        {helpTextRules.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              color: "#8091A5",
              background: "#F7F9FA",
              borderRadius: "6px",
            }}
          >
            <Paragraph style={{ color: "#8091A5", marginBottom: 0 }}>
              No help text rules configured yet. Click "Add Help Text" to get
              started.
            </Paragraph>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <Table>
              <Table.Head style={{ background: "#F7F9FA" }}>
                <Table.Row>
                  <Table.Cell style={{ width: "40px" }}>
                    <Checkbox
                      isChecked={
                        selectedHelpTextIndices.length === helpTextRules.length &&
                        helpTextRules.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHelpTextIndices(helpTextRules.map((_, i) => i));
                        } else {
                          setSelectedHelpTextIndices([]);
                        }
                      }}
                    />
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Content Type
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Controlling Field
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Value
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Target Field
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Help Text
                  </Table.Cell>
                  <Table.Cell style={{ fontWeight: 600, color: "#536171" }}>
                    Status
                  </Table.Cell>
                  <Table.Cell
                    style={{
                      fontWeight: 600,
                      color: "#536171",
                      width: "140px",
                    }}
                  >
                    Actions
                  </Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {helpTextRules.map((helpTextRule, index) => (
                  <Table.Row
                    key={index}
                    style={{
                      opacity: helpTextRule.enabled === false ? 0.5 : 1,
                    }}
                  >
                    <Table.Cell>
                      <Checkbox
                        isChecked={selectedHelpTextIndices.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedHelpTextIndices([
                              ...selectedHelpTextIndices,
                              index,
                            ]);
                          } else {
                            setSelectedHelpTextIndices(
                              selectedHelpTextIndices.filter((i) => i !== index),
                            );
                          }
                        }}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {
                        contentTypes.find(
                          (ct) => ct.sys.id === helpTextRule.contentType,
                        )?.name
                      }
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="primary">
                        {helpTextRule.conditions[0].field}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="warning">
                        {helpTextRule.conditions[0].value}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="secondary">
                        {helpTextRule.targetField}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell
                      style={{
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {helpTextRule.helpText}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        variant={
                          helpTextRule.enabled !== false
                            ? "positive"
                            : "negative"
                        }
                      >
                        {helpTextRule.enabled !== false
                          ? "Enabled"
                          : "Disabled"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          size="small"
                          variant={
                            helpTextRule.enabled !== false
                              ? "negative"
                              : "positive"
                          }
                          onClick={() => toggleHelpTextEnabled(index)}
                        >
                          {helpTextRule.enabled !== false
                            ? "Disable"
                            : "Enable"}
                        </Button>
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() =>
                            handleStartEditHelpText(helpTextRule, index)
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="negative"
                          onClick={() => handleDeleteHelpText(index)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}

        {selectedHelpTextIndices.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              background: "#EBF5FF",
              borderRadius: "4px",
              marginTop: "8px",
            }}
          >
            <Paragraph style={{ marginBottom: 0, fontSize: "14px" }}>
              {selectedHelpTextIndices.length} rule(s) selected
            </Paragraph>
            <Button
              size="small"
              variant="positive"
              onClick={() => toggleSelectedHelpTextsEnabled(true)}
            >
              Enable Selected
            </Button>
            <Button
              size="small"
              variant="negative"
              onClick={() => toggleSelectedHelpTextsEnabled(false)}
            >
              Disable Selected
            </Button>
          </div>
        )}

        {showHelpTextForm && (
          <div
            style={{
              marginTop: "20px",
              padding: "24px",
              background: "#F7F9FA",
              border: "1px solid #D3DAE6",
              borderRadius: "6px",
            }}
          >
            <Subheading style={{ marginBottom: "16px" }}>
              {editingHelpTextIndex !== null
                ? "Edit Help Text Rule"
                : "Add Help Text Rule"}
            </Subheading>
            <div style={{ display: "flex", gap: "16px" }}>
              <FormControl style={{ flex: 1 }}>
                <FormControl.Label>Content Type</FormControl.Label>
                <Select
                  value={helpTextContentType}
                  onChange={(e) => setHelpTextContentType(e.target.value)}
                >
                  <Select.Option value="">Select a content type</Select.Option>
                  {contentTypes.map((contentType) => (
                    <Select.Option
                      key={contentType.sys.id}
                      value={contentType.sys.id}
                    >
                      {contentType.name}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl style={{ flex: 1 }}>
                <FormControl.Label>Controlling Field</FormControl.Label>
                <Select
                  value={helpTextControllingField?.id}
                  onChange={(e) => {
                    const field = helpTextFields.find(
                      (f) => f.id === e.target.value,
                    );
                    setHelpTextControllingField(field);
                  }}
                >
                  <Select.Option value="">Select a field</Select.Option>
                  {helpTextFields.map((field) => (
                    <Select.Option key={field.id} value={field.id}>
                      {field.name}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl style={{ flex: 1 }}>
                <FormControl.Label>Value to match</FormControl.Label>
                {helpTextValueOptions.length > 0 ? (
                  <Select
                    value={helpTextValue}
                    onChange={(e) => setHelpTextValue(e.target.value)}
                  >
                    <Select.Option value="">Select a value</Select.Option>
                    {helpTextValueOptions.map((option) => (
                      <Select.Option key={option} value={option}>
                        {option}
                      </Select.Option>
                    ))}
                  </Select>
                ) : (
                  <TextInput
                    value={helpTextValue}
                    onChange={(e) => setHelpTextValue(e.target.value)}
                    placeholder="Enter value to match"
                  />
                )}
              </FormControl>
            </div>
            <div style={{ display: "flex", gap: "16px" }}>
              <FormControl style={{ flex: 1 }}>
                <FormControl.Label>Target Field</FormControl.Label>
                <Select
                  value={helpTextTargetField}
                  onChange={(e) => setHelpTextTargetField(e.target.value)}
                >
                  <Select.Option value="">Select a field</Select.Option>
                  {helpTextFields.map((field) => (
                    <Select.Option key={field.id} value={field.id}>
                      {field.name}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl style={{ flex: 1 }}>
                <FormControl.Label>Help Text</FormControl.Label>
                <Textarea
                  value={helpTextContent}
                  onChange={(e) => setHelpTextContent(e.target.value)}
                  placeholder="Enter help text to display under the target field..."
                  rows={3}
                />
              </FormControl>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <Button variant="primary" onClick={handleSaveHelpText}>
                {editingHelpTextIndex !== null
                  ? "Update Help Text"
                  : "Save Help Text"}
              </Button>
              <Button variant="secondary" onClick={handleCancelEditHelpText}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigScreen;
