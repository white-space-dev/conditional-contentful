import React, { useCallback, useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  FormControl,
  Select,
  TextInput,
  Checkbox,
  Heading,
  Paragraph,
  Note,
} from "@contentful/f36-components";
import { css } from "emotion";
import { useCMA, useSDK } from "@contentful/react-apps-toolkit";

// Build an empty condition object.
const createEmptyCondition = (fields) => {
  const firstField = fields && fields.length > 0 ? fields[0].id : '';
  return {
    field: firstField,
    operator: 'eq',
    value: '',
  };
};

// Construct a blank rule with default values.
const createEmptyRule = (fields) => ({
  conditions: [createEmptyCondition(fields)],
  logic: 'all',
  targets: [],
  widgetId: '',
  message: '',
  showMessage: true,
  setValue: '',
  clearOnHide: false,
});

// Predefine common widget editor IDs so editors can pick from a list instead of free‑typing.
const widgetOptions = [
  { id: '',            label: 'Use default editor' },
  { id: 'singleLine',  label: 'Single line' },
  { id: 'multipleLine',label: 'Multiple line' },
  { id: 'slugEditor',  label: 'Slug' },
  { id: 'urlEditor',   label: 'URL' },
  { id: 'dropdown',    label: 'Dropdown' },
  { id: 'boolean',     label: 'Boolean' },
  { id: 'tagsEditor',  label: 'Tags' },
  { id: 'checkbox',    label: 'Checkbox' },
  { id: 'ratingEditor',label: 'Rating' },
  { id: 'jsonEditor',  label: 'JSON' },
  { id: 'dateEditor',  label: 'Date' },
];

const ConfigScreen = () => {
  const [parameters, setParameters] = useState({});
  const [rules, setRules] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedContentTypeId, setSelectedContentTypeId] = useState("");
  const [fields, setFields] = useState([]);
  const sdk = useSDK();
  /*
     To use the cma, inject it as follows.
     If it is not needed, you can remove the next line.
  */
  const cma = useCMA();
  const onConfigure = useCallback(async () => {
    console.log("onConfigure")
    // This method will be called when a user clicks on "Install"
    // or "Save" in the configuration screen.
    // for more details see https://www.contentful.com/developers/docs/extensibility/ui-extensions/sdk-reference/#register-an-app-configuration-hook

    // Get current the state of EditorInterface and other entities
    // related to this app installation
    const currentState = await sdk.app.getCurrentState();
      console.log("🚀 ~ ConfigScreen ~ JSON.stringify(rules):", JSON.stringify(rules))
      console.log("🚀 ~ ConfigScreen ~ selectedContentTypeId:", selectedContentTypeId)
    return {
      // Parameters to be persisted as the app configuration.
      parameters: { rules: JSON.stringify(rules), contentTypeId: selectedContentTypeId },
      // In case you don't want to submit any update to app
      // locations, you can just pass the currentState as is
      targetState: currentState,
    };
  }, [parameters, sdk, rules]);

  const onSave = async () => {
  try {
    await sdk.app.setParameters({
      contentTypeId: selectedContentTypeId,
      rules: JSON.stringify(rules),
    });
    sdk.notifier.success('Saved!');
  } catch (e) {
    sdk.notifier.error('Failed to save');
  }
};

  useEffect(() => {
    // `onConfigure` allows to configure a callback to be
    // invoked when a user attempts to install the app or update
    // its configuration.
    sdk.app.onConfigure(() => onConfigure());
      
  }, [sdk, onConfigure]);

  useEffect(() => {
    (async () => {
      // Get current parameters of the app.
      // If the app is not installed yet, `parameters` will be `null`.

      const ctRes = await cma.contentType.getMany({ query: { limit: 1000 } });
      setContentTypes(ctRes.items);
      const params = await sdk.app.getParameters();
      console.log("🚀 ~ ConfigScreen ~ params:", params)
      let storedCt = params?.contentTypeId || "";
      if (storedCt && ctRes.items.find((ct) => ct.sys.id === storedCt)) {
        setSelectedContentTypeId(storedCt);
        setFields(
          ctRes.items.find((ct) => ct.sys.id === storedCt).fields || []
        );
      } else if (ctRes.items.length > 0) {
        const first = ctRes.items[0];
        setSelectedContentTypeId(first.sys.id);
        setFields(first.fields || []);
      }

      if (params && params.rules) {
        const parsed = JSON.parse(params.rules);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((r) => ({
            conditions: r.conditions || [createEmptyCondition([])],
            logic: r.logic || "all",
            targets: r.targets || [],
            widgetId: r.widgetId || "",
            message: r.message || "",
            showMessage: r.showMessage !== undefined ? r.showMessage : true,
            setValue: r.setValue || "",
            clearOnHide: !!r.clearOnHide,
          }));
          setRules(normalized);
          console.log("🚀 ~ ConfigScreen ~ normalized:", normalized)
        }
      }
      const initialRules = params?.rules ? JSON.parse(params.rules) : [];
      setRules(initialRules);
      if (params) {
        setParameters(params);
      }
      // Once preparation has finished, call `setReady` to hide
      // the loading screen and present the app to a user.
      sdk.app.setReady();
    })();
  }, [sdk, cma]);

    // Update field list when content type changes.
  useEffect(() => {
    if (selectedContentTypeId) {
      const ct = contentTypes.find((ct) => ct.sys.id === selectedContentTypeId);
      setFields(ct ? ct.fields || [] : []);
    }
  }, [selectedContentTypeId, contentTypes]);

console.log("🚀 ~ ConfigScreen ~ rules:", rules)
  const addRule = () => {
    setRules((prev) => [...prev, createEmptyRule(fields)]);
  };

  const updateRule = (index, newRule) => {
    setRules((prev) => prev.map((r, i) => (i === index ? newRule : r)));
  };

  const deleteRule = (index) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  return (
       <Box padding="spacingL" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Heading marginBottom="spacingM">Conditional Fields Configuration</Heading>
      <Paragraph marginBottom="spacingM">
        Select a content type and then define rules that control which fields are shown in the entry editor.
        Each rule evaluates one or more conditions on controlling fields, and shows target fields when those
        conditions are satisfied.
      </Paragraph>

      {/* Content type selector */}
      <FormControl marginBottom="spacingL">
        <FormControl.Label>Content Type</FormControl.Label>
        <Select
          value={selectedContentTypeId}
          onChange={(e) => {
            setSelectedContentTypeId(e.target.value);
            // Reset rules on content type switch to avoid mismatched IDs.
            setRules([]);
          }}
        >
          {contentTypes.map((ct) => (
            <Select.Option key={ct.sys.id} value={ct.sys.id}>
              {ct.name || ct.sys.id}
            </Select.Option>
          ))}
        </Select>
      </FormControl>

      {/* Render rule cards */}
      {console.log("🚀 ~ rules:", rules)}
      {rules.map((rule, index) => (
        <RuleCard
          key={index}
          rule={rule}
          fields={fields}
          onChange={(updated) => updateRule(index, updated)}
          onDelete={() => deleteRule(index)}
        />
      ))}

      <Flex justifyContent="flex-start" marginTop="spacingL" gap="spacingS">
        <Button variant="secondary" onClick={addRule}>Add Rule</Button>
        <Button variant="positive" onClick={onSave}>Save</Button>
      </Flex>
    </Box>
  );
};
export default ConfigScreen;

// RuleCard component used inside ConfigScreen to edit a single rule.
const RuleCard = ({ rule, fields, onChange, onDelete }) => {
  // Update individual condition.
  const updateCondition = (condIndex, patch) => {
    const newConditions = rule.conditions.map((c, i) =>
      i === condIndex ? { ...c, ...patch } : c
    );
    onChange({ ...rule, conditions: newConditions });
  };

  const addCondition = () => {
    onChange({ ...rule, conditions: [...rule.conditions, createEmptyCondition(fields)] });
  };

  const removeCondition = (condIndex) => {
    const newConditions = rule.conditions.filter((_, i) => i !== condIndex);
    onChange({ ...rule, conditions: newConditions });
  };

  // Toggle selection of target fields.
  const toggleTarget = (fieldId) => {
    const current = new Set(rule.targets);
    if (current.has(fieldId)) {
      current.delete(fieldId);
    } else {
      current.add(fieldId);
    }
    onChange({ ...rule, targets: Array.from(current) });
  };

  return (
    <Card marginBottom="spacingL" padding="spacingM">
      <Flex justifyContent="space-between" alignItems="flex-start" marginBottom="spacingM">
        <Heading as="h4" marginBottom="none">Rule</Heading>
        <Button variant="negative" size="small" onClick={onDelete}>Delete</Button>
      </Flex>

      {/* Conditions list */}
      {rule.conditions.map((condition, idx) => (
        <Flex key={idx} gap="spacingS" alignItems="flex-end" marginBottom="spacingS">
          {/* Controlling field */}
          {console.log("🚀 ~ RuleCard ~ condition:", condition)}
          <FormControl flex="1">
            <FormControl.Label>Field</FormControl.Label>
            <Select
              name={`field-${idx}`}
              value={condition.field}
              onChange={(e) => updateCondition(idx, { field: e.target.value })}
            >
              {fields.map((f) => (
                <Select.Option key={f.id} value={f.id}>
                  {f.name || f.id}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          {/* Operator */}
          <FormControl width="100px">
            <FormControl.Label>Operator</FormControl.Label>
            <Select
              name={`operator-${idx}`}
              value={condition.operator}
              onChange={(e) => updateCondition(idx, { operator: e.target.value })}
            >
              <Select.Option value="eq">=</Select.Option>
              <Select.Option value="!=">≠</Select.Option>
              <Select.Option value=">">&gt;</Select.Option>
              <Select.Option value="<">&lt;</Select.Option>
              <Select.Option value="contains">contains</Select.Option>
              <Select.Option value="notContains">not contains</Select.Option>
            </Select>
          </FormControl>

          {/* Value */}
          <FormControl flex="1">
            <FormControl.Label>Value</FormControl.Label>
            <Select
              name={`value-${idx}`}
              value={condition.value}
              onChange={(e) => updateCondition(idx, { value: e.target.value })}
              placeholder="Value"
            >
              {fields.map((f) => (
                <Select.Option key={f.id} value={f.id}>
                  {f.name || f.id}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          {/* Remove condition button */}
          {rule.conditions.length > 1 && (
            <Button variant="negative" size="small" onClick={() => removeCondition(idx)}>
              Remove
            </Button>
          )}
        </Flex>
      ))}

      {/* Add condition button */}
      <Button variant="secondary" size="small" onClick={addCondition}>Add Condition</Button>

      {/* Logic (AND/OR) */}
      <FormControl marginTop="spacingM">
        <FormControl.Label>Logic</FormControl.Label>
        <Select
          value={rule.logic}
          onChange={(e) => onChange({ ...rule, logic: e.target.value })}
        >
          <Select.Option value="all">All conditions (AND)</Select.Option>
          <Select.Option value="any">Any condition (OR)</Select.Option>
        </Select>
      </FormControl>

      {/* Target fields */}
      <Box marginTop="spacingM">
        <FormControl>
          <FormControl.Label>Target fields</FormControl.Label>
          <Flex flexWrap="wrap" gap="spacingXs">
            {fields.map((f) => (
              <Checkbox
                key={f.id}
                id={`target-${f.id}`}
                name={`target-${f.id}`}
                value={f.id}
                isChecked={rule.targets.includes(f.id)}
                onChange={() => toggleTarget(f.id)}
              >
                {f.name || f.id}
              </Checkbox>
            ))}
          </Flex>
        </FormControl>
      </Box>

      {/* Optional settings: widget, explanation message, auto-set and clear flags */}
      <Box marginTop="spacingM">
        <FormControl marginBottom="spacingS">
          <FormControl.Label>Widget (optional)</FormControl.Label>
          <Select
            value={rule.widgetId}
            onChange={(e) => onChange({ ...rule, widgetId: e.target.value })}
          >
            {widgetOptions.map((opt) => (
              <Select.Option key={opt.id} value={opt.id}>{opt.label}</Select.Option>
            ))}
          </Select>
        </FormControl>

        {/* Toggle message display */}
        <Checkbox
          isChecked={rule.showMessage}
          onChange={() => {
            if (rule.showMessage) {
              onChange({ ...rule, showMessage: false, message: '' });
            } else {
              onChange({ ...rule, showMessage: true });
            }
          }}
          style={{ marginBottom: '8px' }}
        >
          Show explanation message when hidden
        </Checkbox>

        {/* Message text input */}
        {rule.showMessage && (
          <FormControl marginBottom="spacingS">
            <FormControl.Label>Message</FormControl.Label>
            <TextInput
              value={rule.message}
              onChange={(e) => onChange({ ...rule, message: e.target.value })}
              placeholder="This field is hidden because…"
            />
          </FormControl>
        )}

        {/* Auto-set value */}
        <FormControl marginBottom="spacingS">
          <FormControl.Label>Auto‑set value (optional)</FormControl.Label>
          <TextInput
            value={rule.setValue}
            onChange={(e) => onChange({ ...rule, setValue: e.target.value })}
            placeholder="Value to assign when shown"
          />
        </FormControl>

        {/* Clear on hide */}
        <Checkbox
          isChecked={rule.clearOnHide}
          onChange={() => onChange({ ...rule, clearOnHide: !rule.clearOnHide })}
        >
          Clear value when hidden
        </Checkbox>
      </Box>
    </Card>
  );
};