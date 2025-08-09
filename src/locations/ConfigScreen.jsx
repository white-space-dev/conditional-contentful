import React, { useState, useEffect, useCallback } from 'react';
import {
  Heading,
  Paragraph,
  FormControl,
  TextInput,
  Button,
  Select,
  Table,
  Checkbox,
} from '@contentful/f36-components';
import { useCMA, useSDK } from '@contentful/react-apps-toolkit';

const ConfigScreen = () => {
  const cma = useCMA();
  const sdk = useSDK();
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState('');
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(undefined);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [value, setValue] = useState('');
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [rules, setRules] = useState([]);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [showForm, setShowForm] = useState(false);
  console.log("🚀 ~ ConfigScreen ~ rules:", rules)

  const onConfigure = useCallback(async () => {
    const parameters = await sdk.app.getParameters();
    console.log("🚀 ~ ConfigScreen ~ parameters:", parameters)
    if (parameters && parameters.rules) {
      setRules(JSON.parse(parameters.rules));
      setSelectedContentType(parameters.contentTypeId);
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
    setShowForm(false);
  };

  const handleStartEdit = (rule, index) => {
    setEditingRuleIndex(index);
    setSelectedContentType(rule.contentType);
    setEditingFieldId(rule.conditions[0].field);
    setValue(rule.conditions[0].value);
    setSelectedTargets(rule.targets);
    setShowForm(true);
  };

  const handleDeleteRule = (index) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const handleCancelEdit = () => {
    setEditingRuleIndex(null);
    setSelectedContentType('');
    setSelectedField(undefined);
    setValue('');
    setSelectedTargets([]);
    setShowForm(false);
  };

  useEffect(() => {
    sdk.app.onConfigure(() => {
      return {
        targetState: { EditorInterface: { [selectedContentType]: { sidebar: { position: 1 } } } },
        parameters: { rules: JSON.stringify(rules), contentTypeId: selectedContentType },
      };
    });
  }, [sdk.app, rules, selectedContentType]);

  const valueOptions = (
    selectedField?.items?.validations?.find((v) => v.in)?.in ||
    selectedField?.validations?.find((v) => v.in)?.in ||
    []
  );

  const showEmptyForm = () => {
    setShowForm(true);
  };
  return (
    <div style={{ marginLeft: '20px', marginRight: '20px' }}>
      <Heading>Conditional Fields</Heading>
      <Paragraph>
        Welcome to the Conditional Fields app! This app allows you to
        conditionally show or hide fields in your content types.
      </Paragraph>
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
                <Button onClick={() => handleStartEdit(rule, index)}>Edit</Button>
                <Button onClick={() => handleDeleteRule(index)} style={{ marginLeft: '10px' }} variant="negative">
                  Delete
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Button onClick={() => showEmptyForm()} style={{ marginLeft: '10px' }}>
          Add Rule
      </Button>
{showForm && (
  <>
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
        <Button onClick={handleCancelEdit} style={{ marginLeft: '10px' }}>
          Cancel
        </Button>
      )}
      </>
)}
    </div>
  );
};

export default ConfigScreen;
