import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { Field, FieldWrapper } from "@contentful/default-field-editors";
import { FormControl, TextInput } from "@contentful/f36-components";

const LazyCustomColorPicker = lazy(() =>
  import("../components/CustomColorPicker"),
);

const LazyCloudinaryField = lazy(() =>
  import("../components/CloudinaryField"),
);

const CustomFieldInput = ({ sdk: fieldSdk }) => {
  const [value, setValue] = useState(fieldSdk.field.getValue() || "");

  useEffect(() => {
    const detach = fieldSdk.field.onValueChanged((newValue) => {
      setValue(newValue || "");
    });
    return () => detach();
  }, [fieldSdk.field]);

  return (
    <TextInput
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        fieldSdk.field.setValue(e.target.value);
      }}
    />
  );
};

const evaluateCondition = (actual, expected, operator) => {
  switch (operator) {
    case "eq":
      return String(actual) === expected;
    case "!=":
      return String(actual) !== expected;
    case ">": {
      const a = parseFloat(actual);
      const b = parseFloat(expected);
      return !isNaN(a) && !isNaN(b) ? a > b : String(actual) > expected;
    }
    case "<": {
      const a = parseFloat(actual);
      const b = parseFloat(expected);
      return !isNaN(a) && !isNaN(b) ? a < b : String(actual) < expected;
    }
    case "contains":
      if (Array.isArray(actual)) return actual.includes(expected);
      return String(actual || "").includes(expected);
    case "notContains":
      if (Array.isArray(actual)) return !actual.includes(expected);
      return !String(actual || "").includes(expected);
    default:
      return false;
  }
};

const EntryEditor = () => {
  const sdk = useSDK();

  const rules = useMemo(() => {
    try {
      const params = sdk.parameters.installation;
      const currentCt = sdk.contentType?.sys?.id;
      if (params?.rules) {
        const parsed = JSON.parse(params.rules);
        if (Array.isArray(parsed)) {
          return parsed.filter((r) => r.contentType === currentCt && r.enabled !== false);
        }
      }
    } catch (err) {
      console.error("Error parsing rules:", err);
    }
    return [];
  }, [sdk.parameters.installation, sdk.contentType]);

  const helpTextRules = useMemo(() => {
    try {
      const params = sdk.parameters.installation;
      const currentCt = sdk.contentType?.sys?.id;
      if (params?.helpTextRules) {
        const parsed = JSON.parse(params.helpTextRules);
        if (Array.isArray(parsed)) {
          return parsed.filter((r) => r.contentType === currentCt && r.enabled !== false);
        }
      }
    } catch (err) {
      console.error("Error parsing helpTextRules:", err);
    }
    return [];
  }, [sdk.parameters.installation, sdk.contentType]);

  const [controllerValues, setControllerValues] = useState({});

  // Register listeners for controlling field changes across all locales.
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

    // Initialize with current values for every locale the field supports.
    const initialValues = {};
    controllerIds.forEach((id) => {
      const field = sdk.entry.fields[id];
      if (!field) return;
      initialValues[id] = {};
      const fieldLocales = field.locales || [sdk.locales.default];
      fieldLocales.forEach((locale) => {
        initialValues[id][locale] = field.getForLocale(locale).getValue();
      });
    });
    setControllerValues(initialValues);

    // Listen for changes on every locale the field supports.
    const unregisters = [];
    controllerIds.forEach((id) => {
      const field = sdk.entry.fields[id];
      if (!field) return;
      const fieldLocales = field.locales || [sdk.locales.default];
      fieldLocales.forEach((locale) => {
        const detach = field.getForLocale(locale).onValueChanged((value) => {
          setControllerValues((prev) => ({
            ...prev,
            [id]: { ...prev[id], [locale]: value },
          }));
        });
        unregisters.push(detach);
      });
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
      const results = rule.conditions.map((cond) => {
        const locale = cond.locale || sdk.locales.default;
        const fieldValues = controllerValues[cond.field];
        return evaluateCondition(
          fieldValues ? fieldValues[locale] : undefined,
          cond.value,
          cond.operator,
        );
      });
      const matches =
        rule.logic === "all" ? results.every(Boolean) : results.some(Boolean);

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
      const results = rule.conditions.map((cond) => {
        const locale = cond.locale || sdk.locales.default;
        const fieldValues = controllerValues[cond.field];
        return evaluateCondition(
          fieldValues ? fieldValues[locale] : undefined,
          cond.value,
          cond.operator,
        );
      });
      const matches =
        rule.logic === "all" ? results.every(Boolean) : results.some(Boolean);

      if (matches && rule.targetField) {
        helpTexts[rule.targetField] = rule.helpText;
      }
    });

    return helpTexts;
  }, [controllerValues, helpTextRules]);

  // Build a map of fieldId -> { widgetId, widgetNamespace } from editor interface controls.
  const widgetIdMap = useMemo(() => {
    const map = {};
    const controls = sdk.editor?.editorInterface?.controls || [];
    controls.forEach((control) => {
      if (control.fieldId && control.widgetId) {
        map[control.fieldId] = {
          widgetId: control.widgetId,
          widgetNamespace: control.widgetNamespace || "builtin",
        };
      }
    });
    return map;
  }, [sdk.editor]);

  console.log('widgetIdMap', widgetIdMap);

  // Render custom widgets that @contentful/default-field-editors doesn't support.
const renderFieldEditor = (widgetId, fieldSdk) => {
  const fieldId = fieldSdk.field.id;
  const control = widgetIdMap[fieldId];

  // Only intercept specific custom widgets we handle ourselves
  if (control && control.widgetNamespace !== "builtin") {
    const isColorPicker = control.widgetId === "colourpicker";

    if (isColorPicker) {
      return (
        <Suspense fallback={<div style={{ padding: 8 }}>Loading...</div>}>
          <LazyCustomColorPicker sdk={fieldSdk} />
        </Suspense>
      );
    }

    // For app widgets (like Cloudinary), render our custom CloudinaryField component
    if (control.widgetNamespace === "app") {
      return (
        <Suspense fallback={<div style={{ padding: 8 }}>Loading...</div>}>
          <LazyCloudinaryField sdk={fieldSdk} widgetId={control.widgetId} />
        </Suspense>
      );
    }

    // Fallback for extension widgets that aren't handled above
    return <CustomFieldInput sdk={fieldSdk} />;
  }

  return null; // Let the default Field component handle built-in widgets
};

  // Pre-build FieldAppSDK-compatible objects for every field × locale combination.
const fieldSdkMap = useMemo(() => {
  const map = {};
  if (!sdk.contentType) return map;

  sdk.contentType.fields.forEach((fieldDef) => {
    const fieldId = fieldDef.id;
    const entryField = sdk.entry.fields[fieldId];
    if (!entryField) return;

    const locales = entryField.locales || [sdk.locales.default];

    locales.forEach((locale) => {
      const fieldApi = entryField.getForLocale(locale);
      map[`${fieldId}::${locale}`] = {
        ...sdk,
          field: fieldApi,
        parameters: {
          ...sdk.parameters,
          instance: {},
        },
      };
    });
  });

  return map;
}, [sdk.contentType, sdk.entry.fields]);

  // Determine which locales each field supports.
  const getFieldLocales = (fieldDef) => {
    const entryField = sdk.entry.fields[fieldDef.id];
    const locales = entryField?.locales || [sdk.locales.default];
    return [...locales].sort((a, b) => {
      if (a === sdk.locales.default) return -1;
      if (b === sdk.locales.default) return 1;
      return 0;
    });
  };

  return (
    <div style={{ padding: "16px" }}>
      {sdk.contentType.fields.map((fieldDef) => {
        const fieldId = fieldDef.id;
        const vis = fieldVisibility[fieldId];

        if (!vis || !vis.isVisible) return null;

        const locales = getFieldLocales(fieldDef);
        const helpText = fieldHelpTexts[fieldId];

        return (
          <div key={fieldId} style={{ marginBottom: "16px" }}>
            {locales.map((locale) => {
              const fieldSdk = fieldSdkMap[`${fieldId}::${locale}`];
              const localeLabel =
                locales.length > 1 ? ` (${locale})` : "";

              return (
                <div key={`${fieldId}-${locale}`} style={{ marginBottom: locales.length > 1 ? "8px" : 0 }}>
                  <FieldWrapper
                    sdk={fieldSdk}
                    name={`${fieldDef.name}${localeLabel}`}
                  >
                    <Field
                      sdk={fieldSdk}
                      widgetId={widgetIdMap[fieldId]?.widgetId}
                      renderFieldEditor={renderFieldEditor}
                    />
                    {helpText && locale === locales[0] && (
                      <FormControl.HelpText>{helpText}</FormControl.HelpText>
                    )}
                  </FieldWrapper>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default EntryEditor;
