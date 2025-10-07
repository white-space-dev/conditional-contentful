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
  const [helpTextControllingField, setHelpTextControllingField] = useState(undefined);
  const [helpTextEditingFieldId, setHelpTextEditingFieldId] = useState(null);
  const [helpTextValue, setHelpTextValue] = useState("");
  const [helpTextTargetField, setHelpTextTargetField] = useState("");
  const [helpTextContent, setHelpTextContent] = useState("");
  const [editingHelpTextIndex, setEditingHelpTextIndex] = useState(null);
  const [showHelpTextForm, setShowHelpTextForm] = useState(false);
  const [validationError, setValidationError] = useState("");

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
      if (!rule.contentType || !rule.conditions[0]?.field || !rule.conditions[0]?.value || rule.targets.length === 0) {
        return "All rule fields must be filled. Please check your Show/Hide Rules.";
      }
    }

    // Validate help text rules
    for (const helpText of helpTextRules) {
      if (!helpText.contentType || !helpText.conditions[0]?.field || !helpText.conditions[0]?.value || !helpText.targetField || !helpText.helpText) {
        return "All help text fields must be filled. Please check your Help Text Rules.";
      }
    }

    return null;
  };

  const handleSaveRule = () => {
    if (!selectedContentType || !selectedField || !value || selectedTargets.length === 0) {
      setValidationError("Please fill in all fields before saving the rule.");
      return;
    }

    const newRule = {
      contentType: selectedContentType,
      conditions: [{ field: selectedField.id, operator: "eq", value }],
      targets: selectedTargets,
      logic: "all",
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
    if (!helpTextContentType || !helpTextControllingField || !helpTextValue || !helpTextTargetField || !helpTextContent) {
      setValidationError("Please fill in all fields before saving the help text.");
      return;
    }

    const newHelpTextRule = {
      contentType: helpTextContentType,
      conditions: [{ field: helpTextControllingField.id, operator: "eq", value: helpTextValue }],
      targetField: helpTextTargetField,
      helpText: helpTextContent,
      logic: "all",
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

      return {
        parameters: {
          rules: JSON.stringify(rules),
          helpTextRules: JSON.stringify(helpTextRules),
          contentTypeId: selectedContentType,
        },
        targetState: { EditorInterface: { ...currentState?.EditorInterface } },
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
    <div style={{ marginLeft: "20px", marginRight: "20px" }}>
      <Heading>Conditional Fields</Heading>
      <Paragraph>
        Welcome to the Conditional Fields app! This app allows you to
        conditionally show or hide fields in your content types.
      </Paragraph>
      {validationError && (
        <Note variant="negative" style={{ marginBottom: "20px" }}>
          {validationError}
        </Note>
      )}

      {/* Show/Hide Rules Section */}
      <Subheading style={{ marginTop: "24px", marginBottom: "16px" }}>
        Show/Hide Rules
      </Subheading>
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Cell>Content Type</Table.Cell>
            <Table.Cell>Controlling Field</Table.Cell>
            <Table.Cell>Operator</Table.Cell>
            <Table.Cell>Value</Table.Cell>
            <Table.Cell>Target Fields</Table.Cell>
            <Table.Cell>Actions</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rules.map((rule, index) => (
            <Table.Row key={index}>
              <Table.Cell>
                {
                  contentTypes.find((ct) => ct.sys.id === rule.contentType)
                    ?.name
                }
              </Table.Cell>
              <Table.Cell>{rule.conditions[0].field}</Table.Cell>
              <Table.Cell>{rule.conditions[0].operator}</Table.Cell>
              <Table.Cell>{rule.conditions[0].value}</Table.Cell>
              <Table.Cell>{rule.targets.join(", ")}</Table.Cell>
              <Table.Cell>
                <Button onClick={() => handleStartEdit(rule, index)}>
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteRule(index)}
                  style={{ marginLeft: "10px" }}
                  variant="negative"
                >
                  Delete
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Button onClick={() => showEmptyForm()} style={{ marginTop: "10px" }}>
        Add Show/Hide Rule
      </Button>
      {showForm && (
        <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc", borderRadius: "4px" }}>
          <Subheading>Add/Edit Show/Hide Rule</Subheading>
          <FormControl>
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
          <FormControl>
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
          <FormControl>
            <FormControl.Label>Value to match</FormControl.Label>
            {valueOptions.length > 0 ? (
              <Select value={value} onChange={(e) => setValue(e.target.value)}>
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
          <FormControl>
            <FormControl.Label>Fields to show/hide</FormControl.Label>
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
                      selectedTargets.filter((id) => id !== field.id)
                    );
                  }
                }}
              >
                {field.name}
              </Checkbox>
            ))}
          </FormControl>
          <Button onClick={handleSaveRule}>
            {editingRuleIndex !== null ? "Update Rule" : "Add Rule"}
          </Button>
          <Button onClick={handleCancelEdit} style={{ marginLeft: "10px" }}>
            Cancel
          </Button>
        </div>
      )}
            {/* Help Text Rules Section */}
            <Subheading style={{ marginTop: "40px", marginBottom: "16px" }}>
        Help Text Rules
      </Subheading>
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Cell>Content Type</Table.Cell>
            <Table.Cell>Controlling Field</Table.Cell>
            <Table.Cell>Value</Table.Cell>
            <Table.Cell>Target Field</Table.Cell>
            <Table.Cell>Help Text</Table.Cell>
            <Table.Cell>Actions</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {helpTextRules.map((helpTextRule, index) => (
            <Table.Row key={index}>
              <Table.Cell>
                {
                  contentTypes.find((ct) => ct.sys.id === helpTextRule.contentType)
                    ?.name
                }
              </Table.Cell>
              <Table.Cell>{helpTextRule.conditions[0].field}</Table.Cell>
              <Table.Cell>{helpTextRule.conditions[0].value}</Table.Cell>
              <Table.Cell>{helpTextRule.targetField}</Table.Cell>
              <Table.Cell style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                {helpTextRule.helpText}
              </Table.Cell>
              <Table.Cell>
                <Button onClick={() => handleStartEditHelpText(helpTextRule, index)} size="small">
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteHelpText(index)}
                  style={{ marginLeft: "10px" }}
                  variant="negative"
                  size="small"
                >
                  Delete
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Button onClick={() => showEmptyHelpTextForm()} style={{ marginTop: "10px" }}>
        Add Help Text Rule
      </Button>

      {showHelpTextForm && (
        <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc", borderRadius: "4px" }}>
          <Subheading>Add/Edit Help Text Rule</Subheading>
          <FormControl>
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
          <FormControl>
            <FormControl.Label>Controlling Field (to watch)</FormControl.Label>
            <Select
              value={helpTextControllingField?.id}
              onChange={(e) => {
                const field = helpTextFields.find((f) => f.id === e.target.value);
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
          <FormControl>
            <FormControl.Label>Value to match</FormControl.Label>
            {helpTextValueOptions.length > 0 ? (
              <Select value={helpTextValue} onChange={(e) => setHelpTextValue(e.target.value)}>
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
          <FormControl>
            <FormControl.Label>Target Field (where to show help text)</FormControl.Label>
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
          <FormControl>
            <FormControl.Label>Help Text</FormControl.Label>
            <FormControl.HelpText>
              This text will be displayed under the target field when the condition matches
            </FormControl.HelpText>
            <Textarea
              value={helpTextContent}
              onChange={(e) => setHelpTextContent(e.target.value)}
              placeholder="Enter help text to display under the target field..."
              rows={3}
            />
          </FormControl>
          <Button onClick={handleSaveHelpText}>
            {editingHelpTextIndex !== null ? "Update Help Text" : "Add Help Text"}
          </Button>
          <Button onClick={handleCancelEditHelpText} style={{ marginLeft: "10px" }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConfigScreen;
