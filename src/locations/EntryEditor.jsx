import React, { useEffect, useMemo, useState } from 'react';
import { useSDK } from '@contentful/react-apps-toolkit';
import { Field, FieldWrapper } from '@contentful/default-field-editors';
import { FormControl } from '@contentful/f36-components';

const evaluateCondition = (actual, expected, operator) => {
  switch (operator) {
    case 'eq':
      return String(actual) === expected;
    case '!=':
      return String(actual) !== expected;
    case '>': {
      const a = parseFloat(actual);
      const b = parseFloat(expected);
      return !isNaN(a) && !isNaN(b) ? a > b : String(actual) > expected;
    }
    case '<': {
      const a = parseFloat(actual);
      const b = parseFloat(expected);
      return !isNaN(a) && !isNaN(b) ? a < b : String(actual) < expected;
    }
    case 'contains':
      if (Array.isArray(actual)) return actual.includes(expected);
      return String(actual || '').includes(expected);
    case 'notContains':
      if (Array.isArray(actual)) return !actual.includes(expected);
      return !String(actual || '').includes(expected);
    default:
      return false;
  }
};

const EntryEditor = () => {
  const sdk = useSDK();

  const [rules, setRules] = useState([]);
  const [helpTextRules, setHelpTextRules] = useState([]);
  const [controllerValues, setControllerValues] = useState({});

  // Load rules from installation parameters (synchronous).
  useEffect(() => {
    try {
      const params = sdk.parameters.installation;
      const currentCt = sdk.contentType?.sys?.id;

      if (params && params.rules) {
        const parsed = JSON.parse(params.rules);
        if (Array.isArray(parsed)) {
          setRules(parsed.filter(rule => rule.contentType === currentCt));
        }
      }

      if (params && params.helpTextRules) {
        const parsed = JSON.parse(params.helpTextRules);
        if (Array.isArray(parsed)) {
          setHelpTextRules(parsed.filter(rule => rule.contentType === currentCt));
        }
      }
    } catch (err) {
      console.error('Error parsing installation parameters:', err);
    }
  }, [sdk]);

  // Register listeners for controlling field changes.
  useEffect(() => {
    const controllerIds = new Set();

    rules.forEach((rule) => {
      rule.conditions.forEach((cond) => {
        if (cond.field) controllerIds.add(cond.field);
      });
    });

    helpTextRules.forEach((rule) => {
      rule.conditions.forEach((cond) => {
        if (cond.field) controllerIds.add(cond.field);
      });
    });

    // Initialize with current values.
    const initialValues = {};
    controllerIds.forEach((id) => {
      const field = sdk.entry.fields[id];
      if (field) initialValues[id] = field.getValue();
    });
    setControllerValues(initialValues);

    // Listen for changes.
    const unregisters = [];
    controllerIds.forEach((id) => {
      const field = sdk.entry.fields[id];
      if (field) {
        const detach = field.onValueChanged((value) => {
          setControllerValues((prev) => ({ ...prev, [id]: value }));
        });
        unregisters.push(detach);
      }
    });

    return () => {
      unregisters.forEach((fn) => fn());
    };
  }, [rules, helpTextRules, sdk.entry.fields]);

  // Memoize the field visibility calculation.
  const fieldVisibility = useMemo(() => {
    if (!sdk.contentType) return {};

    const visibility = {};

    // Initialize all fields as visible.
    sdk.contentType.fields.forEach((f) => {
      visibility[f.id] = { isVisible: true };
    });

    rules.forEach((rule) => {
      const results = rule.conditions.map((cond) =>
        evaluateCondition(controllerValues[cond.field], cond.value, cond.operator)
      );
      const matches = rule.logic === 'all' ? results.every(Boolean) : results.some(Boolean);

      rule.targets.forEach((target) => {
        if (!visibility[target]) return;
        if (matches) {
          visibility[target].isVisible = false;
        }
      });
    });

    return visibility;
  }, [controllerValues, rules, sdk.contentType]);

  // Memoize help text per field.
  const fieldHelpTexts = useMemo(() => {
    const helpTexts = {};

    helpTextRules.forEach((rule) => {
      const results = rule.conditions.map((cond) =>
        evaluateCondition(controllerValues[cond.field], cond.value, cond.operator)
      );
      const matches = rule.logic === 'all' ? results.every(Boolean) : results.some(Boolean);

      if (matches && rule.targetField) {
        helpTexts[rule.targetField] = rule.helpText;
      }
    });

    return helpTexts;
  }, [controllerValues, helpTextRules]);

  // Build a FieldAppSDK-compatible object for a given field.
  const buildFieldSdk = (fieldId) => {
    const entryField = sdk.entry.fields[fieldId];
    const fieldApi = entryField.getForLocale(sdk.locales.default);

    return {
      ...sdk,
      field: fieldApi,
      parameters: {
        ...sdk.parameters,
        instance: {},
      },
    };
  };

  return (
    <div style={{ padding: '16px' }}>
      {sdk.contentType.fields.map((fieldDef) => {
        const fieldId = fieldDef.id;
        const vis = fieldVisibility[fieldId];

        if (!vis || !vis.isVisible) return null;

        const fieldSdk = buildFieldSdk(fieldId);
        const helpText = fieldHelpTexts[fieldId];

        return (
          <div key={fieldId} style={{ marginBottom: '16px' }}>
            <FieldWrapper sdk={fieldSdk} name={fieldDef.name}>
              <Field sdk={fieldSdk} />
              {helpText && (
                <FormControl.HelpText>{helpText}</FormControl.HelpText>
              )}
            </FieldWrapper>
          </div>
        );
      })}
    </div>
  );
};

export default EntryEditor;
