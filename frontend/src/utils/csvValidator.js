export function parseCSVText(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || "";
    });
    return obj;
  });

  return { headers, rows };
}

export function validateBatchCSV(rows, headers) {
  const REQUIRED = [
    'gender', 'SeniorCitizen', 'Partner', 'Dependents', 'tenure',
    'PhoneService', 'MultipleLines', 'InternetService', 'OnlineSecurity', 'OnlineBackup',
    'DeviceProtection', 'TechSupport', 'StreamingTV', 'StreamingMovies', 'Contract',
    'PaperlessBilling', 'PaymentMethod', 'MonthlyCharges'
  ];

  const missingColumns = REQUIRED.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    return { valid: false, missingColumns, errors: [], validRowIndices: [], summary: { total: rows.length, valid: 0, invalid: rows.length } };
  }

  const errors = [];
  const validRowIndices = [];

  const ENUMS = {
    Contract: ['Month-to-month', 'One year', 'Two year'],
    InternetService: ['Fiber optic', 'DSL', 'No'],
    PaymentMethod: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'],
    gender: ['Male', 'Female']
  };

  const YES_NO_FIELDS = [
    'Partner', 'Dependents', 'PhoneService', 'MultipleLines', 'OnlineSecurity',
    'OnlineBackup', 'DeviceProtection', 'TechSupport', 'StreamingTV', 'StreamingMovies',
    'PaperlessBilling'
  ];

  rows.forEach((row, index) => {
    let rowHasError = false;
    const rowNum = index + 1;

    // Numerical checks
    const tenure = parseInt(row.tenure);
    if (isNaN(tenure) || tenure < 0 || tenure > 72) {
      errors.push({ row: rowNum, column: 'tenure', message: 'Must be 0-72 numeric', value: row.tenure });
      rowHasError = true;
    }

    const mc = parseFloat(row.MonthlyCharges);
    if (isNaN(mc) || mc < 0 || mc > 500) {
      errors.push({ row: rowNum, column: 'MonthlyCharges', message: 'Must be 0-500 numeric', value: row.MonthlyCharges });
      rowHasError = true;
    }

    const sc = parseInt(row.SeniorCitizen);
    if (sc !== 0 && sc !== 1) {
      errors.push({ row: rowNum, column: 'SeniorCitizen', message: 'Must be 0 or 1', value: row.SeniorCitizen });
      rowHasError = true;
    }

    // Enum checks
    Object.keys(ENUMS).forEach(col => {
      const val = row[col];
      const validOptions = ENUMS[col];
      if (col === 'gender') {
        if (!validOptions.some(opt => opt.toLowerCase() === (val || "").toLowerCase())) {
          errors.push({ row: rowNum, column: col, message: `Must be one of [${validOptions.join(', ')}]`, value: val });
          rowHasError = true;
        }
      } else {
        if (!validOptions.includes(val)) {
          errors.push({ row: rowNum, column: col, message: `Must be one of [${validOptions.join(', ')}]`, value: val });
          rowHasError = true;
        }
      }
    });

    // Yes/No checks
    YES_NO_FIELDS.forEach(col => {
      const val = (row[col] || "").toLowerCase();
      if (val !== 'yes' && val !== 'no') {
        errors.push({ row: rowNum, column: col, message: 'Must be Yes or No', value: row[col] });
        rowHasError = true;
      }
    });

    if (!rowHasError) {
      validRowIndices.push(index);
    }
  });

  return {
    valid: true,
    missingColumns: [],
    errors,
    validRowIndices,
    summary: {
      total: rows.length,
      valid: validRowIndices.length,
      invalid: rows.length - validRowIndices.length
    }
  };
}
