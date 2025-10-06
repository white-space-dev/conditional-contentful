import React, { useEffect, useMemo, useState } from 'react';
import { useSDK, useAutoResizer } from '@contentful/react-apps-toolkit';
import { Field } from '@contentful/default-field-editors';
import { Note, HelpText } from '@contentful/f36-components';

const EntryEditor = () => {
  const sdk = useSDK();
  useAutoResizer();

  const [rules, setRules] = useState([]);
  const [helpTextRules, setHelpTextRules] = useState([]);
  const [controllerValues, setControllerValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize the field visibility calculation.
  const fieldVisibility = useMemo(() => {
    if (!sdk.contentType) {
      return {};
    }
    const visibility = {};
    const toAutoSet = [];

    // Initialize all fields as visible.
    sdk.contentType.fields.forEach((f) => {
      visibility[f.id] = {
        isVisible: true,
        message: '',
        widgetId: undefined,
        helpText: '',
      };
    });

    // Process show/hide rules
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
        if (!visibility[target]) return;

        if (matches) {
          visibility[target].isVisible = false;
          if (rule.showMessage !== false && rule.message) {
            visibility[target].message = rule.message;
          }
          if (rule.clearOnHide) {
            const field = sdk.entry.fields[target];
            if (field) field.setValue(null);
          }
        } else {
          visibility[target].isVisible = true;
          if (rule.widgetId) {
            visibility[target].widgetId = rule.widgetId;
          }
          if (rule.setValue !== undefined && rule.setValue !== '') {
            toAutoSet.push({ fieldId: target, value: rule.setValue });
          }
        }
      });
    });

    // Process help text rules separately
    helpTextRules.forEach((helpTextRule) => {
      const results = helpTextRule.conditions.map((cond) => {
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

      const matches = helpTextRule.logic === 'all' ? results.every(Boolean) : results.some(Boolean);

      // Apply help text to the target field if condition matches
      if (matches && helpTextRule.targetField && visibility[helpTextRule.targetField]) {
        visibility[helpTextRule.targetField].helpText = helpTextRule.helpText;
      }
    });

    // Apply auto-set operations.
    toAutoSet.forEach(({ fieldId, value }) => {
      const field = sdk.entry.fields[fieldId];
      if (field) {
        const current = field.getValue();
        if (current !== value) field.setValue(value);
      }
    });

    return visibility;
  }, [controllerValues, rules, helpTextRules, sdk]);

  // Load rules and initialize controller values.
  useEffect(() => {
    const init = async () => {
      try {
        const params = await sdk.app.getParameters();
        
        const currentCt = sdk.contentType?.sys?.id;
        const controllerIds = new Set();

        // Load show/hide rules
        if (params && params.rules) {
          const parsed = JSON.parse(params.rules);
          if (Array.isArray(parsed)) {
            const filteredRules = parsed.filter(rule => rule.contentType === currentCt);
            setRules(filteredRules);

            // Collect controller field IDs
            filteredRules.forEach((rule) => {
              rule.conditions.forEach((cond) => {
                if (cond.field) controllerIds.add(cond.field);
              });
            });
          }
        }

        // Load help text rules
        if (params && params.helpTextRules) {
          const parsedHelpText = JSON.parse(params.helpTextRules);
          if (Array.isArray(parsedHelpText)) {
            const filteredHelpTextRules = parsedHelpText.filter(rule => rule.contentType === currentCt);
            setHelpTextRules(filteredHelpTextRules);

            // Collect controller field IDs from help text rules
            filteredHelpTextRules.forEach((rule) => {
              rule.conditions.forEach((cond) => {
                if (cond.field) controllerIds.add(cond.field);
              });
            });
          }
        }

        // Initialize controller values
        const initialValues = {};
        controllerIds.forEach((id) => {
          const field = sdk.entry.fields[id];
          if (field) initialValues[id] = field.getValue();
        });
        setControllerValues(initialValues);

      } catch (error) {
        console.error("Error fetching app parameters:", error);
        setError("Error fetching app parameters. Please make sure the app is installed correctly.");
      }
      setLoading(false);
    };
    init();
  }, [sdk]);

  // Register listeners for controlling field changes.
  useEffect(() => {
    const controllerIds = new Set();
    
    // Collect from show/hide rules
    rules.forEach((rule) => {
      rule.conditions.forEach((cond) => {
        if (cond.field) controllerIds.add(cond.field);
      });
    });

    // Collect from help text rules
    helpTextRules.forEach((rule) => {
      rule.conditions.forEach((cond) => {
        if (cond.field) controllerIds.add(cond.field);
      });
    });

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
  }, [rules, helpTextRules, sdk]);

  if (loading) {
    return <p>Loading editor…</p>;
  }

  if (error) {
    return <Note variant="negative">{error}</Note>;
  }

  return (
    <div style={{ padding: '16px' }}>
      {sdk.contentType.fields.map((fieldDef) => {
        const fieldId = fieldDef.id;
        const visibility = fieldVisibility[fieldId];

        if (!visibility || !visibility.isVisible) {
          return null;
        }

        return (
          <div key={fieldId} style={{ marginBottom: '16px' }}>
            <Field sdk={{ field: sdk.entry.fields[fieldId] }} widgetId={visibility.widgetId} />
            {visibility.helpText && (
              <HelpText style={{ marginTop: '8px' }}>
                {visibility.helpText}
              </HelpText>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EntryEditor;