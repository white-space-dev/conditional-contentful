import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useAutoResizer, useSDK } from '@contentful/react-apps-toolkit';
import { Field as ContentfulField } from '@contentful/default-field-editors';
import NotVisibleMessage from '../components/NotVisibleMessage';

// Lazy-load CustomColorPicker to enable a loader until it is ready
const LazyCustomColorPicker = React.lazy(() => import("../components/CustomColorPicker"));

// Minimal Loader fallback shown while the component/code-split chunk loads
const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
    Loading…
  </div>
);

const Field = () => {
  const sdk = useSDK();
  useAutoResizer();
  const [rules, setRules] = useState([]);
  const [controllerValues, setControllerValues] = useState({});
  const [isVisible, setIsVisible] = useState(true); // New state for visibility

  useEffect(() => {
    const init = async () => {
      try {
        const params = sdk.parameters.installation;
        if (params && params.rules) {
          const parsedRules = JSON.parse(params.rules);
          setRules(parsedRules);

          // Initialize controller values for all controlling fields
          const initialControllerValues = {};
          parsedRules.forEach(rule => {
            rule.conditions.forEach(condition => {
              if (condition.field && sdk.entry.fields[condition.field]) {
                initialControllerValues[condition.field] = sdk.entry.fields[condition.field].getValue();
              }
            });
          });
          setControllerValues(initialControllerValues);
        }

      } catch (error) {
        console.error("Error fetching app parameters:", error);
      }
    };
    init();
  }, [sdk.editor]);

  useEffect(() => {
    const currentFieldId = sdk.field.id;
    let fieldShouldBeVisible = true; // Use a temporary variable

    rules.forEach(rule => {
      const matches = rule.conditions.every(condition => {
        const actual = controllerValues[condition.field];
        const expected = condition.value;
        switch (condition.operator) {
          case 'eq': return String(actual) === expected;
          case '!=': return String(actual) !== expected;
          case '>': return parseFloat(actual) > parseFloat(expected);
          case '<': return parseFloat(actual) < parseFloat(expected);
          case 'contains': return String(actual || '').includes(expected);
          case 'notContains': return !String(actual || '').includes(expected);
          default: return false;
        }
      });

      if (rule.targets.includes(currentFieldId)) {
        if (matches) {
          fieldShouldBeVisible = false; // Hide if condition matches
        } else {
          fieldShouldBeVisible = true; // Show if condition doesn't match
        }
      }
    });
    setIsVisible(fieldShouldBeVisible); // Update the state
  }, [rules, controllerValues, sdk.field]);

  useEffect(() => {
    const controllingFieldIds = new Set();
    rules.forEach(rule => {
      rule.conditions.forEach(condition => {
        controllingFieldIds.add(condition.field);
      });
    });

    const unlisteners = [];
    controllingFieldIds.forEach(fieldId => {
      if (sdk.entry.fields[fieldId]) {
        const detach = sdk.entry.fields[fieldId].onValueChanged(value => {
          setControllerValues(prev => ({ ...prev, [fieldId]: value }));
        });
        unlisteners.push(detach);
      }
    });

    return () => {
      unlisteners.forEach(detach => detach());
    };
  }, [rules, sdk.entry.fields]);

  const widgetId = sdk.parameters.instance.intendedAppearance === 'advanced' 
  ? sdk.parameters.instance.intendedAppearance2 
  : sdk.parameters.instance.intendedAppearance;

  if (sdk.parameters.instance.intendedAppearance === 'customColorPicker') {
    return isVisible ? (
      <Suspense fallback={<Loader />}>
        <LazyCustomColorPicker sdk={sdk} />
      </Suspense>
    ) : (
      <NotVisibleMessage />
    );
  } else {
    return isVisible ? (
      <ContentfulField sdk={sdk} widgetId={widgetId} />
    ) : (
      <NotVisibleMessage />
    );
  }
};

export default Field;