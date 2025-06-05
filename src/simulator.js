// src/simulator.js

/**
 * Deterministic simulatePerformance: no random jitter.
 *
 * For a given `config`, always returns the same:
 *   - time (ms)
 *   - cpu (%)
 *   - memory (%)
 *   - networkTimeline: [ { stage, networkMB }, … ]
 *
 * All calculations use the new formulas discussed in the chat.
 */
export function simulatePerformance(config) {
  // ─── 1. Convert Config Knobs to Numeric Values ───

  // 1.1. Number of workers based on Cluster Size
  const workersByCluster = { Small: 1, Medium: 4, Large: 8 };
  const numWorkers = workersByCluster[config.clusterSize] || 1;

  // 1.2. Total dataset raw size (GB) based on Dataset Size
  //      Small = 10 GB, Medium = 100 GB, Large = 1000 GB
  const datasetRawGBMap = { Small: 10, Medium: 100, Large: 1000 };
  const totalRawGB = datasetRawGBMap[config.datasetSize] || 0;

  // 1.3. Split raw GB into table proportions:
  //      Orders = 60%, Customers = 30%, Products = 10%
  const ordersRawGB = totalRawGB * 0.6;
  const customersRawGB = totalRawGB * 0.3;
  const productsRawGB = totalRawGB * 0.1;

  // 1.4. On-disk GB for each table based on File Format:
  //      Parquet → 50% of raw, CSV → 100% of raw
  const formatFactor = config.fileFormat === "Parquet" ? 0.5 : 1.0;
  const ordersOnDiskGB = ordersRawGB * formatFactor;
  const customersOnDiskGB = customersRawGB * formatFactor;
  const productsOnDiskGB = productsRawGB * formatFactor;

  // 1.5. Helper functions to fetch primary/secondary sizes (raw vs on-disk)
  function getOnDiskGB(tableName) {
    if (tableName === "Orders") return ordersOnDiskGB;
    if (tableName === "Customers") return customersOnDiskGB;
    if (tableName === "Products") return productsOnDiskGB;
    return 0;
  }
  function getRawGB(tableName) {
    if (tableName === "Orders") return ordersRawGB;
    if (tableName === "Customers") return customersRawGB;
    if (tableName === "Products") return productsRawGB;
    return 0;
  }

  // 1.6. Identify primary/secondary sizes
  const primaryOnDiskGB = getOnDiskGB(config.joinPrimary);
  const secondaryOnDiskGB = getOnDiskGB(config.joinSecondary);
  const primaryRawGB = getRawGB(config.joinPrimary);
  const secondaryRawGB = getRawGB(config.joinSecondary);

  // ─── 2. Network Traffic Calculations (GB) ───

  // 2.1. READ traffic:
  //      Read each table once from disk (adjusted for format).
  //      If useCache=true, assume the primary table is cached after first read,
  //      but since the join reads each table exactly once, caching does not reduce initial read.
  let readGB = primaryOnDiskGB + secondaryOnDiskGB;

  // 2.2. SHUFFLE traffic and BROADCAST traffic:
  let shuffleGB = 0;
  let broadcastGB = 0;

  if (config.joinType === "Shuffle") {
    // Shuffle = (primaryOnDiskGB + secondaryOnDiskGB) × (AQE ? 0.7 : 1)
    const sumOnDisk = primaryOnDiskGB + secondaryOnDiskGB;
    shuffleGB = config.aqeEnabled ? sumOnDisk * 0.7 : sumOnDisk;
  } else if (config.joinType === "Broadcast") {
    // Only broadcast if secondaryOnDiskGB ≤ 1 GB
    if (secondaryOnDiskGB <= 1.0) {
      broadcastGB = secondaryOnDiskGB * numWorkers;
      if (config.skewed && config.skewKey === "order_id") {
        broadcastGB *= 1.2;
      }
      // shuffleGB stays 0 when broadcast is valid
    } else {
      // If secondaryOnDiskGB > 1 GB, fallback to shuffle of both tables
      const sumOnDisk = primaryOnDiskGB + secondaryOnDiskGB;
      shuffleGB = config.aqeEnabled ? sumOnDisk * 0.7 : sumOnDisk;
      broadcastGB = 0;
    }
  }

  // 2.3. COMPUTE traffic = Spill + Broadcast
  // 2.3.1. Spill:
  //      • None partitions  → 50% × (primaryRawGB + secondaryRawGB)
  //      • Bad partitions   → 25% × (primaryRawGB + secondaryRawGB)
  //      • Good partitions → 0
  let spillGB = 0;
  if (config.partitionStrategy === "None") {
    spillGB = 0.5 * (primaryRawGB + secondaryRawGB);
  } else if (config.partitionStrategy === "Bad") {
    spillGB = 0.25 * (primaryRawGB + secondaryRawGB);
  }

  // 2.3.2. Broadcast already computed above as broadcastGB
  const computeGB = spillGB + broadcastGB;

  // 2.4. WRITE traffic:
  //      Joined result row count ≈ rows of the larger side. Approximate size by raw GB of larger side.
  //      WriteOnDiskGB = max(primaryRawGB, secondaryRawGB) × formatFactor
  const maxRawGB = Math.max(primaryRawGB, secondaryRawGB);
  const writeGB = maxRawGB * formatFactor;

  // 2.5. Convert each stage to MB (1 GB = 1024 MB) for the timeline
  const GB_TO_MB = 1024;
  const networkTimeline = [
    { stage: "Read",    networkMB: Math.round(readGB    * GB_TO_MB) },
    { stage: "Shuffle", networkMB: Math.round(shuffleGB * GB_TO_MB) },
    { stage: "Compute", networkMB: Math.round(computeGB * GB_TO_MB) },
    { stage: "Write",   networkMB: Math.round(writeGB   * GB_TO_MB) },
  ];

  // ─── 3. Time Calculation (ms) ───
  // Define per-GB costs (ms per GB) for each stage
  const COST_READ = 5;     // 5 ms per GB read
  const COST_SHUFFLE = 10; // 10 ms per GB shuffled
  const COST_COMPUTE = 8;  // 8 ms per GB compute (spill + broadcast)
  const COST_WRITE = 5;    // 5 ms per GB written

  // Sum stage costs (in ms), then divide by numWorkers (parallelism)
  let rawTimeMs =
    readGB   * COST_READ +
    shuffleGB * COST_SHUFFLE +
    computeGB * COST_COMPUTE +
    writeGB  * COST_WRITE;

  let time = rawTimeMs / numWorkers;

  // If skewed, add exact 20% penalty
  if (config.skewed) {
    time *= 1.2;
  }

  // If useCache=true, reduce time by 10% (caching speeds up repeated reads)
  if (config.useCache) {
    time *= 0.9;
  }

  time = Math.round(time);

  // ─── 4. CPU Utilization (%) ───
  // Base CPU = 20% + 2% per GB of raw data total
  // Reduce by 1% per worker (more parallelism → lower %)
  // If AQE enabled, reduce 5%. If skewed, add 10%.
  let cpu = 20 + totalRawGB * 2 - numWorkers * 1;

  if (config.aqeEnabled) {
    cpu -= 5;
  }
  if (config.skewed) {
    cpu *= 1.1;
  }

  cpu = Math.round(cpu);
  cpu = Math.min(100, Math.max(5, cpu)); // clamp between 5% and 100%

  // ─── 5. Memory Utilization (%) ───
  // Total memory available = numWorkers × 10 GB each = numWorkers * 10
  const totalMemoryGB = numWorkers * 10;

  // If useCache=true, cached primary = primaryOnDiskGB × 1.5
  // Otherwise cached = 0
  const cachedGB = config.useCache ? primaryOnDiskGB * 1.5 : 0;

  // Partition count total:
  //   None  → 1
  //   Bad   → 10
  //   Good  → 200
  let partitionCount = 1;
  if (config.partitionStrategy === "Bad") {
    partitionCount = 10;
  } else if (config.partitionStrategy === "Good") {
    partitionCount = 200;
  }

  // Partition overhead = partitionCount × 0.01 GB (per-partition footprint)
  const partitionOverheadGB = partitionCount * 0.01;

  // Total memory used = cachedGB + partitionOverheadGB
  let memUsedGB = cachedGB + partitionOverheadGB;

  // If skewed, assume memory use increases by 10%
  if (config.skewed) {
    memUsedGB *= 1.1;
  }

  // Memory % = (memUsedGB / totalMemoryGB) × 100
  let memory = Math.round((memUsedGB / totalMemoryGB) * 100);
  memory = Math.min(100, Math.max(5, memory)); // clamp between 5% and 100%

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
