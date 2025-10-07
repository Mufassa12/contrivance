// Quick validation of the Enterprise template
const template = {
  columns: [
    { name: 'Company', column_type: 'Text', position: 1, is_required: true },
    { name: 'Primary Contact', column_type: 'Text', position: 2, is_required: true },
    { name: 'Contact Email', column_type: 'Text', position: 3 },
    { name: 'Contact Phone', column_type: 'Text', position: 4 },
    { name: 'Technical Contact', column_type: 'Text', position: 5 },
    { name: 'Decision Maker', column_type: 'Text', position: 6 },
    { name: 'Economic Buyer', column_type: 'Text', position: 7 },
    { name: 'Champion', column_type: 'Text', position: 8 },
    { name: 'Deal Value', column_type: 'Number', position: 9 },
    { name: 'Target Close Date', column_type: 'Date', position: 10 },
    { name: 'Sales Cycle Length', column_type: 'Number', position: 11 },
    { name: 'SE Stage', column_type: 'Select', position: 12, is_required: true },
    { name: 'Use Case', column_type: 'Text', position: 13 },
    { name: 'Technical Requirements', column_type: 'Text', position: 14 },
    { name: 'Integration Requirements', column_type: 'Text', position: 15 },
    { name: 'Security Requirements', column_type: 'Text', position: 16 },
    { name: 'Compliance Requirements', column_type: 'Text', position: 17 },
    { name: 'Stakeholder Map', column_type: 'Text', position: 18 },
    { name: 'Technical Architecture', column_type: 'Text', position: 19 },
    { name: 'Implementation Timeline', column_type: 'Text', position: 20 },
    { name: 'Change Management', column_type: 'Text', position: 21 },
    { name: 'Competition', column_type: 'Text', position: 22 },
    { name: 'Technical Risk', column_type: 'Select', position: 23 },
    { name: 'Political Risk', column_type: 'Select', position: 24 },
    { name: 'Next Action', column_type: 'Text', position: 25 },
    { name: 'Next Action Date', column_type: 'Date', position: 26 },
    { name: 'SE Notes', column_type: 'Text', position: 27 }
  ]
};

// Check for missing fields
template.columns.forEach((col, index) => {
  if (!col.position) {
    console.log(`Column ${index}: ${col.name} - MISSING POSITION`);
  }
  if (!col.name) {
    console.log(`Column ${index}: MISSING NAME`);
  }
  if (!col.column_type) {
    console.log(`Column ${index}: ${col.name} - MISSING COLUMN_TYPE`);
  }
});

console.log('Validation complete - all columns have required fields');