// src/simulator.js

/**
 * Deterministic simulatePerformance: no random jitter.
 *
 * For a given `config`, always returns the same:
 *   - time (ms)
 *   - cpu (%)
 *   - memory (%)
 *   - networkTimeline: [ { stage, networkMB }, … ]
 */
export function simulatePerformance(config) {
  // ─── 1. Base metrics (time, CPU, memory) ───

  // Map dataset sizes → work factor (no randomness)
  const datasetFactor = { Small: 1, Medium: 2, Large: 5 };

  // Map cluster sizes → speed factor
  const clusterFactor = { Small: 1.2, Medium: 1.0, Large: 0.8 };

  // “Ideal” base time on Medium/Medium baseline
  const baseTimeMs = 200;

  // Compute rawTime deterministically
  let time = Math.round(
    baseTimeMs *
    (datasetFactor[config.datasetSize] || 1) *
    (clusterFactor[config.clusterSize] || 1)
  );

  // If skew enabled, add exact 20% penalty (no randomness)
  if (config.skewed) {
    time = Math.round(time * 1.2);
  }

  // ─── CPU Utilization ───
  let cpu = 30 +
    (datasetFactor[config.datasetSize] * 10) +
    (config.clusterSize === 'Small' ? 20 : config.clusterSize === 'Large' ? -5 : 0);

  if (config.useCache) cpu -= 5;
  if (config.aqeEnabled) cpu -= 5;

  if (config.skewed) {
    cpu = Math.round(cpu * 1.1); // exact +10% if skewed
  } else {
    cpu = Math.round(cpu);
  }

  // Clamp deterministically
  cpu = Math.min(100, Math.max(10, cpu));

  // ─── Memory Utilization ───
  let memory = 40 + (datasetFactor[config.datasetSize] * 8);

  if (config.partitionStrategy === 'Good') memory -= 5;
  if (config.partitionStrategy === 'Bad') memory += 5;

  if (config.skewed) {
    memory = Math.round(memory * 1.1); // exact +10% if skewed
  } else {
    memory = Math.round(memory);
  }

  memory = Math.min(100, Math.max(10, memory));

  // ─── 2. Partition Count Logic ───
  const totalSizesMB = { Small: 500, Medium: 2000, Large: 10000 };
  const totalMB = totalSizesMB[config.datasetSize] || 0;

  const ordersMB = Math.round(totalMB * 0.6);
  const customersMB = Math.round(totalMB * 0.3);
  const productsMB = Math.round(totalMB * 0.1);

  function computePartitionCountForTable(tableMB) {
    const SMALL_TABLE_THRESHOLD_MB = 1000;
    const isSmall = tableMB < SMALL_TABLE_THRESHOLD_MB;
    if (isSmall) {
      return config.partitionStrategy === 'Good' ? 1 : 4;
    } else {
      return config.partitionStrategy === 'Good' ? 4 : 1;
    }
  }

  const ordersPartitions = computePartitionCountForTable(ordersMB);
  const customersPartitions = computePartitionCountForTable(customersMB);
  const productsPartitions = computePartitionCountForTable(productsMB);

  // ─── 3. Network Usage Timeline ───
  const stages = ['Read', 'Shuffle', 'Compute', 'Write'];

  const executorsByCluster = { Small: 2, Medium: 4, Large: 8 };
  const numExecutors = executorsByCluster[config.clusterSize] || 4;

  const networkTimeline = stages.map((stage) => {
    if (stage === 'Read') {
      // Entire dataset read; CSV adds 10%
      let readMB = totalMB;
      if (config.fileFormat === 'CSV') {
        readMB = Math.round(totalMB * 1.1);
      }
      return { stage, networkMB: readMB };
    }

    if (stage === 'Shuffle') {
      if (config.joinType === 'Broadcast') {
        // Broadcast the smaller table to all executors
        let tableToBroadcastMB = 0;
        if (
          config.joinPrimary === 'Orders' &&
          config.joinSecondary === 'Customers'
        ) {
          tableToBroadcastMB = customersMB;
        } else if (
          config.joinPrimary === 'Orders' &&
          config.joinSecondary === 'Products'
        ) {
          tableToBroadcastMB = productsMB;
        } else if (
          config.joinPrimary === 'Customers' &&
          config.joinSecondary === 'Orders'
        ) {
          tableToBroadcastMB = ordersMB;
        } else if (
          config.joinPrimary === 'Customers' &&
          config.joinSecondary === 'Products'
        ) {
          tableToBroadcastMB = productsMB;
        } else if (
          config.joinPrimary === 'Products' &&
          config.joinSecondary === 'Orders'
        ) {
          tableToBroadcastMB = ordersMB;
        } else if (
          config.joinPrimary === 'Products' &&
          config.joinSecondary === 'Customers'
        ) {
          tableToBroadcastMB = customersMB;
        }

        // Broadcast volume = table size × #executors
        let broadcastMB = tableToBroadcastMB * numExecutors;

        // Skew adds exactly 20%
        if (config.skewed && config.skewKey === 'order_id') {
          broadcastMB = Math.round(broadcastMB * 1.2);
        }

        return { stage, networkMB: broadcastMB };
      }

      // Shuffle join:
      let shuffleBaseMB = 0;
      if (
        config.joinPrimary === 'Orders' &&
        config.joinSecondary === 'Customers'
      ) {
        shuffleBaseMB = Math.round(ordersMB * 0.3 + customersMB * 0.3);
      } else if (
        config.joinPrimary === 'Orders' &&
        config.joinSecondary === 'Products'
      ) {
        shuffleBaseMB = Math.round(ordersMB * 0.3 + productsMB * 0.3);
      } else if (
        config.joinPrimary === 'Customers' &&
        config.joinSecondary === 'Orders'
      ) {
        shuffleBaseMB = Math.round(customersMB * 0.3 + ordersMB * 0.3);
      } else if (
        config.joinPrimary === 'Customers' &&
        config.joinSecondary === 'Products'
      ) {
        shuffleBaseMB = Math.round(customersMB * 0.3 + productsMB * 0.3);
      } else if (
        config.joinPrimary === 'Products' &&
        config.joinSecondary === 'Orders'
      ) {
        shuffleBaseMB = Math.round(productsMB * 0.3 + ordersMB * 0.3);
      } else if (
        config.joinPrimary === 'Products' &&
        config.joinSecondary === 'Customers'
      ) {
        shuffleBaseMB = Math.round(productsMB * 0.3 + customersMB * 0.3);
      }

      // “Bad” partition strategy → +20% overhead
      if (config.partitionStrategy === 'Bad') {
        shuffleBaseMB = Math.round(shuffleBaseMB * 1.2);
      }

      // Skew adds exactly 20%
      if (config.skewed && config.skewKey === 'order_id') {
        shuffleBaseMB = Math.round(shuffleBaseMB * 1.2);
      }

      return { stage, networkMB: shuffleBaseMB };
    }

    if (stage === 'Compute') {
      return { stage, networkMB: 0 };
    }

    // ── Write Stage ──
    let writeMB = totalMB;
    if (config.fileFormat === 'CSV') {
      writeMB = Math.round(totalMB * 1.1);
    }
    return { stage, networkMB: writeMB };
  });

  return { time, cpu, memory, networkTimeline };
}

/**
 * Deterministic challenge score.
 */
export function scoreRun(config, time, level) {
  if (!level || !level.maxPoints || !level.difficulty) {
    return 0;
  }
  const rawScore = level.maxPoints - time / level.difficulty;
  return Math.max(0, Math.round(rawScore));
}
