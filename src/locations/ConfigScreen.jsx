import React, { useState, useEffect, useCallback } from 'react';
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
} from '@contentful/f36-components';
import { useCMA, useSDK } from '@contentful/react-apps-toolkit';

const ConfigScreen = () => {
  const cma = useCMA();
  const sdk = useSDK();
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState('');
  const [fields, setFields] = useState([]);
  
  // Rule states
  const [selectedField, setSelectedField] = useState(undefined);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [value, setValue] = useState('');
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [rules, setRules] = useState([]);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [showRuleForm, setShowRuleForm] = useState(false);

  // Help Text states
  const [helpTextRules, setHelpTextRules] = useState([]);
  const [helpTextField, setHelpTextField] = useState(undefined);
  const [helpTextEditingFieldId, setHelpTextEditingFieldId] = useState(null);
  const [helpTextValue, setHelpTextValue] = useState('');
  const [helpTextTargetField, setHelpTextTargetField] = useState('');
  const [helpTextContent, setHelpTextContent] = useState('');
  const [editingHelpTextIndex, setEditingHelpTextIndex] = useState(null);
  const [showHelpTextForm, setShowHelpTextForm] = useState(false);

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
        const contentType = await cma.contentType.get({ contentTypeId: selectedContentType });
        setFields(contentType.fields);
      };
      fetchFields();
    }
  }, [cma, selectedContentType]);

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
    if (helpTextEditingFieldId && fields.length > 0) {
      const field = fields.find((f) => f.id === helpTextEditingFieldId);
      if (field) {
        setHelpTextField(field);
        setHelpTextEditingFieldId(null);
      }
    }
  }, [fields, helpTextEditingFieldId]);

  // Rule handlers
  const handleSaveRule = () => {
    const newRule = {
      contentType: selectedContentType,
      conditions: [{ field: selectedField.id, operator: 'eq', value }],
      targets: selectedTargets,
      logic: 'all',
    };

    if (editingRuleIndex !== null) {
      const newRules = [...rules];
      newRules[editingRuleIndex] = newRule;
      setRules(newRules);
      setEditingRuleIndex(null);
    } else {
      setRules([...rules, newRule]);
    }
    setShowRuleForm(false);
    resetRuleForm();
  };

  const handleStartEditRule = (rule, index) => {
    setEditingRuleIndex(index);
    setSelectedContentType(rule.contentType);
    setEditingFieldId(rule.conditions[0].field);
    setValue(rule.conditions[0].value);
    setSelectedTargets(rule.targets);
    setShowRuleForm(true);
  };

  const handleDeleteRule = (index) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const handleCancelEditRule = () => {
    setEditingRuleIndex(null);
    resetRuleForm();
    setShowRuleForm(false);
  };

  const resetRuleForm = () => {
    setSelectedContentType('');
    setSelectedField(undefined);
    setValue('');
    setSelectedTargets([]);
  };

  const showEmptyRuleForm = () => {
    resetRuleForm();
    setShowRuleForm(true);
  };

  // Help Text handlers
  const handleSaveHelpText = () => {
    const newHelpTextRule = {
      contentType: selectedContentType,
      conditions: [{ field: helpTextField.id, operator: 'eq', value: helpTextValue }],
      targetField: helpTextTargetField,
      helpText: helpTextContent,
      logic: 'all',
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
    resetHelpTextForm();
  };

  const handleStartEditHelpText = (helpTextRule, index) => {
    setEditingHelpTextIndex(index);
    setSelectedContentType(helpTextRule.contentType);
    setHelpTextEditingFieldId(helpTextRule.conditions[0].field);
    setHelpTextValue(helpTextRule.conditions[0].value);
    setHelpTextTargetField(helpTextRule.targetField);
    setHelpTextContent(helpTextRule.helpText);
    setShowHelpTextForm(true);
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
  };

  const resetHelpTextForm = () => {
    setHelpTextField(undefined);
    setHelpTextValue('');
    setHelpTextTargetField('');
    setHelpTextContent('');
  };

  const showEmptyHelpTextForm = () => {
    resetHelpTextForm();
    setShowHelpTextForm(true);
  };

  useEffect(() => {
    sdk.app.onConfigure(() => {
      return {
        targetState: { EditorInterface: { [selectedContentType]: { sidebar: { position: 1 } } } },
        parameters: { 
          rules: JSON.stringify(rules), 
          helpTextRules: JSON.stringify(helpTextRules),
          contentTypeId: selectedContentType 
        },
      };
    });
  }, [sdk.app, rules, helpTextRules, selectedContentType]);

  const valueOptions = (
    selectedField?.items?.validations?.find((v) => v.in)?.in ||
    selectedField?.validations?.find((v) => v.in)?.in ||
    []
  );

  const helpTextValueOptions = (
    helpTextField?.items?.validations?.find((v) => v.in)?.in ||
    helpTextField?.validations?.find((v) => v.in)?.in ||
    []
  );

  return (
    <div style={{ marginLeft: '20px', marginRight: '20px' }}>
      <Heading>Conditional Fields</Heading>
      <Paragraph>
        Welcome to the Conditional Fields app! This app allows you to
        conditionally show or hide fields in your content types.
      </Paragraph>

      {/* Rules Table */}
      <Subheading style={{ marginTop: '24px', marginBottom: '16px' }}>Show/Hide Rules</Subheading>
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
              <Table.Cell>{contentTypes.find(ct => ct.sys.id === rule.contentType)?.name}</Table.Cell>
              <Table.Cell>{rule.conditions[0].field}</Table.Cell>
              <Table.Cell>{rule.conditions[0].operator}</Table.Cell>
              <Table.Cell>{rule.conditions[0].value}</Table.Cell>
              <Table.Cell>{rule.targets.join(', ')}</Table.Cell>
              <Table.Cell>
                <Button onClick={() => handleStartEditRule(rule, index)} size="small">Edit</Button>
                <Button onClick={() => handleDeleteRule(index)} style={{ marginLeft: '10px' }} variant="negative" size="small">
                  Delete
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Button onClick={() => showEmptyRuleForm()} style={{ marginTop: '10px' }}>
        Add Rule
      </Button>

      {showRuleForm && (
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <Subheading>Add/Edit Show/Hide Rule</Subheading>
          <FormControl>
            <FormControl.Label>Content Type</FormControl.Label>
            <Select
              value={selectedContentType}
              onChange={(e) => setSelectedContentType(e.target.value)}>
              {contentTypes.map((contentType) => (
                <Select.Option key={contentType.sys.id} value={contentType.sys.id}>
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
              }}>
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
                {valueOptions.map((option) => (
                  <Select.Option key={option} value={option}>
                    {option}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <TextInput value={value} onChange={(e) => setValue(e.target.value)} />
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
                    setSelectedTargets(selectedTargets.filter((id) => id !== field.id));
                  }
                }}>
                {field.name}
              </Checkbox>
            ))}
          </FormControl>
          <Button onClick={handleSaveRule}>
            {editingRuleIndex !== null ? 'Update Rule' : 'Add Rule'}
          </Button>
          {editingRuleIndex !== null && (
            <Button onClick={handleCancelEditRule} style={{ marginLeft: '10px' }}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Help Text Table */}
      <Subheading style={{ marginTop: '40px', marginBottom: '16px' }}>Help Text Rules</Subheading>
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
              <Table.Cell>{contentTypes.find(ct => ct.sys.id === helpTextRule.contentType)?.name}</Table.Cell>
              <Table.Cell>{helpTextRule.conditions[0].field}</Table.Cell>
              <Table.Cell>{helpTextRule.conditions[0].value}</Table.Cell>
              <Table.Cell>{helpTextRule.targetField}</Table.Cell>
              <Table.Cell>{helpTextRule.helpText}</Table.Cell>
              <Table.Cell>
                <Button onClick={() => handleStartEditHelpText(helpTextRule, index)} size="small">Edit</Button>
                <Button onClick={() => handleDeleteHelpText(index)} style={{ marginLeft: '10px' }} variant="negative" size="small">
                  Delete
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Button onClick={() => showEmptyHelpTextForm()} style={{ marginTop: '10px' }}>
        Add Help Text
      </Button>

      {showHelpTextForm && (
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <Subheading>Add/Edit Help Text Rule</Subheading>
          <FormControl>
            <FormControl.Label>Content Type</FormControl.Label>
            <Select
              value={selectedContentType}
              onChange={(e) => setSelectedContentType(e.target.value)}>
              {contentTypes.map((contentType) => (
                <Select.Option key={contentType.sys.id} value={contentType.sys.id}>
                  {contentType.name}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormControl.Label>Controlling Field (to watch)</FormControl.Label>
            <Select
              value={helpTextField?.id}
              onChange={(e) => {
                const field = fields.find((f) => f.id === e.target.value);
                setHelpTextField(field);
              }}>
              {fields.map((field) => (
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
                {helpTextValueOptions.map((option) => (
                  <Select.Option key={option} value={option}>
                    {option}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <TextInput value={helpTextValue} onChange={(e) => setHelpTextValue(e.target.value)} />
            )}
          </FormControl>
          <FormControl>
            <FormControl.Label>Target Field (where to show help text)</FormControl.Label>
            <Select
              value={helpTextTargetField}
              onChange={(e) => setHelpTextTargetField(e.target.value)}>
              <Select.Option value="">Select a field</Select.Option>
              {fields.map((field) => (
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
            {editingHelpTextIndex !== null ? 'Update Help Text' : 'Add Help Text'}
          </Button>
          {editingHelpTextIndex !== null && (
            <Button onClick={handleCancelEditHelpText} style={{ marginLeft: '10px' }}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfigScreen;