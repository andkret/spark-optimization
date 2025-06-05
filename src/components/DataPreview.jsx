// src/components/DataPreview.jsx

import React from 'react';

export default function DataPreview({
  dataset,             // "Small" | "Medium" | "Large"
  partitionStrategy,   // "None" | "Good" | "Bad"
  fileFormat,          // "Parquet" | "CSV"
  skewed,              // boolean
  showPartitions,      // boolean: true → show folder/partition layout
}) {
  // ─── 1. Total Raw Sizes (GB) ───
  const datasetRawGBMap = {
    Small: 10,    // 10 GB raw
    Medium: 100,  // 100 GB raw
    Large: 1000,  // 1000 GB raw
  };
  const totalRawGB = datasetRawGBMap[dataset] || 0;

  // ─── 2. Split Raw GB into Tables ───
  const ordersRawGB    = totalRawGB * 0.6;  // 60 %
  const customersRawGB = totalRawGB * 0.3;  // 30 %
  const productsRawGB  = totalRawGB * 0.1;  // 10 %

  // ─── 3. On-Disk GB Based on File Format ───
  //   Parquet = 50 % of raw; CSV = 100 % of raw
  const formatFactor = fileFormat === 'Parquet' ? 0.5 : 1.0;
  const ordersOnDiskGB    = ordersRawGB    * formatFactor;
  const customersOnDiskGB = customersRawGB * formatFactor;
  const productsOnDiskGB  = productsRawGB  * formatFactor;

  // ─── 4. Partition Count Logic (1 GB threshold) ───
  // If onDisk < 1 GB → small; else large
  function computePartitionCount(tableOnDiskGB) {
    const SMALL_THRESHOLD_GB = 1.0;
    const isSmall = tableOnDiskGB < SMALL_THRESHOLD_GB;

    if (partitionStrategy === 'None') {
      return 1;
    }
    if (isSmall) {
      // small table
      return partitionStrategy === 'Good' ? 1 : 4;
    } else {
      // large table
      return partitionStrategy === 'Good' ? 4 : 1;
    }
  }

  const ordersPartitions    = computePartitionCount(ordersOnDiskGB);
  const customersPartitions = computePartitionCount(customersOnDiskGB);
  const productsPartitions  = computePartitionCount(productsOnDiskGB);

  // ─── 5. Build Partition Files for a Table ───
  function buildTablePartitions(tableName, tableOnDiskGB, partitionCount) {
    const files = [];
    let warning = null;

    // “None” strategy = one file
    if (partitionStrategy === 'None') {
      files.push({
        name: `all_data.${fileFormat.toLowerCase()}`,
        sizeGB: tableOnDiskGB,
      });
      return { tableName, tableOnDiskGB, partitionCount: 1, files, warning: null };
    }

    // Only apply skew if more than one partition exists
    if (skewed && tableName === 'orders' && partitionCount > 1) {
      // 40% of on-disk data in one “hot” partition
      const skewGB     = parseFloat((tableOnDiskGB * 0.4).toFixed(2));
      const remainingGB = tableOnDiskGB - skewGB;
      const otherParts  = partitionCount - 1;
      const perOther    = parseFloat((remainingGB / otherParts).toFixed(2));

      // “Hot” partition
      files.push({
        name: `part-00000.${fileFormat.toLowerCase()}`,
        sizeGB: skewGB,
      });
      // Remaining partitions evenly sized
      for (let i = 1; i < partitionCount; i++) {
        files.push({
          name: `part-${String(i).padStart(5, '0')}.${fileFormat.toLowerCase()}`,
          sizeGB: perOther,
        });
      }

      // Warning if any partition is very small (< 0.1 GB)
      const minGB = Math.min(...files.map((f) => f.sizeGB));
      if (minGB < 0.1) {
        warning = `⚠ One partition is only ${minGB.toFixed(2)} GB (very small)`;
      }

      return { tableName, tableOnDiskGB, partitionCount, files, warning };
    }

    // Otherwise: even distribution (no skew or no multiple partitions)
    const sizePerPart = parseFloat((tableOnDiskGB / partitionCount).toFixed(2));
    for (let i = 0; i < partitionCount; i++) {
      files.push({
        name: `part-${String(i).padStart(5, '0')}.${fileFormat.toLowerCase()}`,
        sizeGB: sizePerPart,
      });
    }
    if (sizePerPart < 0.1) {
      warning = `⚠ Partitions are small (${sizePerPart.toFixed(2)} GB each)`;
    }

    return { tableName, tableOnDiskGB, partitionCount, files, warning };
  }

  const ordersData    = buildTablePartitions('orders',    ordersOnDiskGB,    ordersPartitions);
  const customersData = buildTablePartitions('customers', customersOnDiskGB, customersPartitions);
  const productsData  = buildTablePartitions('products',  productsOnDiskGB,  productsPartitions);

  // ─── 6. Render Partition Layout (if showPartitions=true) ───
  if (showPartitions) {
    const totalOnDiskGB = ordersOnDiskGB + customersOnDiskGB + productsOnDiskGB;
    return (
      <div>
        <h4>
          Total On-Disk Dataset: {totalOnDiskGB.toFixed(2)} GB
        </h4>
        <div style={{ paddingLeft: '12px', marginTop: '12px' }}>
          {[ordersData, customersData, productsData].map((tbl) => (
            <div key={tbl.tableName} style={{ marginBottom: '24px' }}>
              {/* Folder Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span style={{ marginRight: '6px' }}>📁</span>
                <strong>/data/{tbl.tableName}/</strong>
                <span style={{ marginLeft: 'auto', color: '#888' }}>
                  (~{tbl.tableOnDiskGB.toFixed(2)} GB total)
                </span>
              </div>

              {/* Strategy & Partition Count */}
              <div style={{ marginBottom: '4px', color: '#666' }}>
                Strategy “{partitionStrategy}” → {tbl.partitionCount} partition
                {tbl.partitionCount > 1 ? 's' : ''}
                {skewed && tbl.tableName === 'orders' && tbl.partitionCount > 1
                  ? ' (skewed)'
                  : ''}
              </div>

              {/* Warning (if any) */}
              {tbl.warning && (
                <div style={{ color: '#e07a5f', marginBottom: '4px' }}>
                  {tbl.warning}
                </div>
              )}

              {/* List of Partition Files */}
              <ul style={{ listStyle: 'none', paddingLeft: '24px' }}>
                {tbl.files.map((f, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <span style={{ marginRight: '6px' }}>📄</span>
                    {f.name}
                    <span style={{ marginLeft: 'auto', color: '#888' }}>
                      ({f.sizeGB.toFixed(2)} GB)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── 7. Render Sample Data Preview (if showPartitions=false) ───
  return (
    <div>
      <h4>Sample Rows (first 5) per Table:</h4>

      {/* ── ORDERS ── */}
      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ marginBottom: '4px' }}>Orders:</h5>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '8px',
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #444', padding: '6px' }}>order_id</th>
              <th style={{ border: '1px solid #444', padding: '6px' }}>customer_id</th>
              <th style={{ border: '1px solid #444', padding: '6px' }}>product_id</th>
              <th style={{ border: '1px solid #444', padding: '6px' }}>quantity</th>
              <th style={{ border: '1px solid #444', padding: '6px' }}>order_date</th>
            </tr>
          </thead>
          <tbody>
            {[
              { order_id: 1000, customer_id: 1, product_id: 100, quantity: 2, order_date: '2025-06-01' },
              { order_id: 1001, customer_id: 3, product_id: 102, quantity: 1, order_date: '2025-06-02' },
              { order_id: 1002, customer_id: 2, product_id: 101, quantity: 5, order_date: '2025-06-03' },
              { order_id: 1003, customer_id: 5, product_id: 104, quantity: 3, order_date: '2025-06-04' },
              { order_id: 1004, customer_id: 4, product_id: 103, quantity: 4, order_date: '2025-06-05' },
            ].map((row) => (
              <tr key={row.order_id}>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.order_id}</td>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.customer_id}</td>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.product_id}</td>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.quantity}</td>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.order_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── CUSTOMERS ── */}
      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ marginBottom: '4px' }}>Customers:</h5>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '8px',
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #444', padding: '6px' }}>customer_id</th>
              <th style={{ border: '1px solid #444', padding: '6px' }}>name</th>
              <th style={{ border: '1px solid #444', padding: '6px' }}>region_id</th>
            </tr>
          </thead>
          <tbody>
            {[
              { customer_id: 1, name: 'Alice Smith', region_id: 10 },
              { customer_id: 2, name: 'Bob Johnson', region_id: 20 },
              { customer_id: 3, name: 'Carol Martinez', region_id: 10 },
              { customer_id: 4, name: 'David Lee', region_id: 30 },
              { customer_id: 5, name: 'Eva Wong', region_id: 20 },
            ].map((row) => (
              <tr key={row.customer_id}>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.customer_id}</td>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.name}</td>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.region_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── PRODUCTS ── */}
      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ marginBottom: '4px' }}>Products:</h5>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '8px',
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #444', padding: '6px' }}>product_id</th>
              <th style={{ border: '1px solid #444', padding: '6px' }}>name</th>
              <th style={{ border: '1px solid #444', padding: '6px' }}>category</th>
            </tr>
          </thead>
          <tbody>
            {[
              { product_id: 100, name: 'Widget A', category: 'Gadgets' },
              { product_id: 101, name: 'Widget B', category: 'Gadgets' },
              { product_id: 102, name: 'Gizmo X', category: 'Electronics' },
              { product_id: 103, name: 'Gizmo Y', category: 'Electronics' },
              { product_id: 104, name: 'Doohickey', category: 'Accessories' },
            ].map((row) => (
              <tr key={row.product_id}>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.product_id}</td>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.name}</td>
                <td style={{ border: '1px solid #444', padding: '6px' }}>{row.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
