/**
 * Utility functions for exporting and importing rules
 */

/**
 * Export rules to a JSON file and trigger download
 * @param {Array} rules - Array of rules to export
 * @param {string} filename - Name of the file to download
 */
export const exportRules = (rules, filename = 'rules.json') => {
  const dataStr = JSON.stringify(rules, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import rules from a JSON file
 * @param {File} file - The file to import
 * @returns {Promise<Array>} - Promise resolving to array of imported rules
 */
export const importRules = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const rules = JSON.parse(event.target.result);
        
        if (!Array.isArray(rules)) {
          reject(new Error('Invalid file format: expected an array of rules'));
          return;
        }
        
        resolve(rules);
      } catch (error) {
        reject(new Error('Failed to parse JSON file: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Trigger file input click for importing
 * @param {Function} onImport - Callback function to handle imported rules
 * @param {Function} onError - Callback function to handle errors
 */
export const triggerImport = (onImport, onError) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const rules = await importRules(file);
      onImport(rules);
    } catch (error) {
      onError(error.message);
    }
  };
  
  input.click();
};
