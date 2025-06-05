// src/components/JoinPreview.jsx

import React from 'react';

export default function JoinPreview({ config }) {
  // ─── Sample Data Definitions ───
  const customers = [
    { customer_id: 1, name: 'Alice Smith', region_id: 10 },
    { customer_id: 2, name: 'Bob Johnson', region_id: 20 },
    { customer_id: 3, name: 'Carol Martinez', region_id: 10 },
    { customer_id: 4, name: 'David Lee', region_id: 30 },
    { customer_id: 5, name: 'Eva Wong', region_id: 20 },
    { customer_id: 6, name: 'Frank Patel', region_id: 10 },
    { customer_id: 7, name: 'Grace Kim', region_id: 30 },
    { customer_id: 8, name: 'Henry Zhao', region_id: 20 },
    { customer_id: 9, name: 'Isabel Chen', region_id: 10 },
    { customer_id: 10, name: 'Jack Li', region_id: 30 },
  ];

  const products = [
    { product_id: 100, name: 'Widget A', category: 'Gadgets' },
    { product_id: 101, name: 'Widget B', category: 'Gadgets' },
    { product_id: 102, name: 'Gizmo X',  category: 'Electronics' },
    { product_id: 103, name: 'Gizmo Y',  category: 'Electronics' },
    { product_id: 104, name: 'Doohickey', category: 'Accessories' },
  ];

  const orders = [
    { order_id: 1000, customer_id: 1, product_id: 100, quantity: 2, order_date: '2025-06-01' },
    { order_id: 1001, customer_id: 3, product_id: 102, quantity: 1, order_date: '2025-06-02' },
    { order_id: 1002, customer_id: 2, product_id: 101, quantity: 5, order_date: '2025-06-03' },
    { order_id: 1003, customer_id: 5, product_id: 104, quantity: 3, order_date: '2025-06-04' },
    { order_id: 1004, customer_id: 4, product_id: 103, quantity: 4, order_date: '2025-06-05' },
    { order_id: 1005, customer_id: 1, product_id: 102, quantity: 1, order_date: '2025-06-06' },
    { order_id: 1006, customer_id: 6, product_id: 100, quantity: 2, order_date: '2025-06-07' },
    { order_id: 1007, customer_id: 8, product_id: 101, quantity: 1, order_date: '2025-06-08' },
    { order_id: 1008, customer_id: 9, product_id: 103, quantity: 6, order_date: '2025-06-09' },
    { order_id: 1009, customer_id: 7, product_id: 104, quantity: 2, order_date: '2025-06-10' },
  ];

  // ─── Determine which tables to join ───
  let joinedRows = [];

  if (
    config.joinPrimary === 'Orders' &&
    config.joinSecondary === 'Customers' &&
    config.joinKey === 'customer_id'
  ) {
    // Join orders → customers on customer_id
    joinedRows = orders.map((o) => {
      const c = customers.find((c) => c.customer_id === o.customer_id) || {};
      return {
        order_id: o.order_id,
        customer_name: c.name || 'N/A',
        product_id: o.product_id,
        quantity: o.quantity,
        order_date: o.order_date,
      };
    });
  } else if (
    config.joinPrimary === 'Orders' &&
    config.joinSecondary === 'Products' &&
    config.joinKey === 'product_id'
  ) {
    // Join orders → products on product_id
    joinedRows = orders.map((o) => {
      const p = products.find((p) => p.product_id === o.product_id) || {};
      return {
        order_id: o.order_id,
        customer_id: o.customer_id,
        product_name: p.name || 'N/A',
        quantity: o.quantity,
        order_date: o.order_date,
      };
    });
  } else {
    // Other combos (Customers→Orders or Customers→Products, etc.) can be added similarly
    joinedRows = [];
  }

  // Only show first 5 rows
  const previewRows = joinedRows.slice(0, 5);

  return (
    <div>
      {previewRows.length === 0 ? (
        <p>No matching join configuration or no rows to display.</p>
      ) : (
        <>
          <h4>Joined Rows (first 5):</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
            <thead>
              <tr>
                {config.joinSecondary === 'Customers' && (
                  <>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>order_id</th>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>customer_name</th>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>product_id</th>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>quantity</th>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>order_date</th>
                  </>
                )}

                {config.joinSecondary === 'Products' && (
                  <>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>order_id</th>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>customer_id</th>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>product_name</th>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>quantity</th>
                    <th style={{ border: '1px solid #555', padding: '8px' }}>order_date</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r, idx) => (
                <tr key={idx}>
                  {config.joinSecondary === 'Customers' && (
                    <>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.order_id}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.customer_name}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.product_id}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.quantity}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.order_date}
                      </td>
                    </>
                  )}

                  {config.joinSecondary === 'Products' && (
                    <>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.order_id}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.customer_id}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.product_name}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.quantity}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '8px' }}>
                        {r.order_date}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
