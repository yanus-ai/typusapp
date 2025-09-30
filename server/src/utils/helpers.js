const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeader = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      let value = row[header];
      
      // Handle JSON objects
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      
      return value;
    }).join(',');
  });

  return csvHeader + '\n' + csvRows.join('\n');
};

module.exports = {
  convertToCSV,
};