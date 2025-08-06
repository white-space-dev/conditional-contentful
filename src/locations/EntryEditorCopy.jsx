import React, { useEffect, useState } from 'react';
import { useSDK, useAutoResizer } from '@contentful/react-apps-toolkit';
import { Field } from '@contentful/default-field-editors';
import { Note } from '@contentful/f36-components';

/**
 * EntryEditor renders the custom entry editing experience.  It uses the
 * installed configuration rules to decide when to show or hide fields,
 * automatically resizes itself, and applies auto-set/clear semantics.
 */
const EntryEditor = () => {
  const sdk = useSDK();
  useAutoResizer();

  const [rules, setRules] = useState([]);
  const [controllerValues, setControllerValues] = useState({});
  const [visibleFields, setVisibleFields] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Load rules from installation parameters on mount.
  useEffect(() => {
    const loadRules = async () => {
      const params = await sdk.app.getParameters();
      if (params && params.rules) {
        const parsed = JSON.parse(params.rules);
        if (Array.isArray(parsed)) {
          const configuredCt = params.contentTypeId;
          const currentCt   = sdk.contentType?.sys?.id;
          // Apply rules only when they were saved for this content type.
          if (!configuredCt || configuredCt === currentCt) {
            setRules(parsed);
          }
        }
      }
      setLoading(false);
    };
    loadRules();
  }, [sdk]);

  // Watch controlling fields whenever rules change.
  useEffect(() => {
    // Gather all controlling field IDs.
    const controllerIds = new Set();
    rules.forEach((rule) => {
      rule.conditions.forEach((cond) => {
        if (cond.field) controllerIds.add(cond.field);
      });
    });

    // Initialize state with current values.
    const initialValues = {};
    controllerIds.forEach((id) => {
      const field = sdk.entry.fields[id];
      if (field) initialValues[id] = field.getValue();
    });
    setControllerValues(initialValues);

    // Register listeners for value changes.
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
  }, [rules, sdk]);

  // Recompute visible fields and auto-set/clear values whenever state changes.
  useEffect(() => {
    const evaluateRules = () => {
      // Start by assuming all fields are visible.
      const visible = new Set(sdk.contentType.fields.map((f) => f.id));
      const toAutoSet = [];

      // Evaluate each rule.
      rules.forEach((rule) => {
        const results = rule.conditions.map((cond) => {
          const actual = controllerValues[cond.field];
          const expected = cond.value;
          switch (cond.operator) {
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
        });

        const matches = rule.logic === 'all' ? results.every(Boolean) : results.some(Boolean);
        rule.targets.forEach((target) => {
          if (matches) {
            visible.add(target);
            if (rule.setValue !== undefined && rule.setValue !== '') {
              toAutoSet.push({ fieldId: target, value: rule.setValue });
            }
          } else {
            visible.delete(target);
            if (rule.clearOnHide) {
              const field = sdk.entry.fields[target];
              if (field) field.setValue(null);
            }
          }
        });
      });

      // Apply auto-set operations.
      toAutoSet.forEach(({ fieldId, value }) => {
        const field = sdk.entry.fields[fieldId];
        if (field) {
          const current = field.getValue();
          if (current !== value) field.setValue(value);
        }
      });

      setVisibleFields(visible);
    };
    evaluateRules();
  }, [controllerValues, rules, sdk]);

  if (loading) {
    return <p>Loading editor…</p>;
  }

  return (
    <div style={{ padding: '16px' }}>
      {sdk.contentType.fields.map((fieldDef) => {
        const fieldId = fieldDef.id;
        const field   = sdk.entry.fields[fieldId];
        const isVisible = visibleFields.has(fieldId);

        // Determine if a rule hides this field and should display a message.
        let message = '';
        rules.forEach((rule) => {
          if (rule.targets.includes(fieldId)) {
            // Evaluate again to find hiding rules.
            const results = rule.conditions.map((cond) => {
              const actual = controllerValues[cond.field];
              const expected = cond.value;
              switch (cond.operator) {
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
            });
            const matches = rule.logic === 'all' ? results.every(Boolean) : results.some(Boolean);
            // Show explanation only when the field is being hidden and showMessage is true.
            if (!matches && rule.showMessage !== false && rule.message) {
              message = rule.message;
            }
          }
        });

        // When hidden, skip rendering Field but show the message if present.
        if (!isVisible) {
          return (
            <div key={fieldId} style={{ marginBottom: '16px' }}>
              {message && <Note variant="warning">{message}</Note>}
            </div>
          );
        }

        // Determine widget override for visible fields.
        const ruleWithWidget = rules.find((r) => r.targets.includes(fieldId) && r.widgetId);
        const widgetOverride = ruleWithWidget ? ruleWithWidget.widgetId : undefined;

        return (
          <div key={fieldId} style={{ marginBottom: '16px' }}>
            <Field sdk={{ field }} widgetId={widgetOverride || undefined} />
          </div>
        );
      })}
    </div>
  );
};

export default EntryEditor;
