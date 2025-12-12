import React, { useState } from 'react';

const TableMessage = ({ custom }) => {
  const [showReasoning, setShowReasoning] = useState(false);

  if (!custom.rows || custom.rows.length === 0) return null;

  const isNumeric = (value) => {
    return typeof value === 'number';
  };

  const formatNumber = (value) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  const columns = Object.keys(custom.rows[0]);
  const numericColumns = new Set();
  columns.forEach(col => {
    if (custom.rows.some(row => isNumeric(row[col]))) {
      numericColumns.add(col);
    }
  });

  const query = custom.query || custom.sql;

  return (
    <div className="table-message-container">
      {custom.title && <div className="table-title">{custom.title}</div>}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} className={numericColumns.has(col) ? 'numeric' : ''}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {custom.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map(col => (
                  <td key={col} className={numericColumns.has(col) ? 'numeric' : ''}>
                    {formatNumber(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {query && (
        <div className="reasoning-container">
          <button
            className="reasoning-toggle"
            onClick={() => setShowReasoning(!showReasoning)}
          >
            {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
          </button>

          {showReasoning && (
            <div className="reasoning-code">
              <pre>{query}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TableMessage;
