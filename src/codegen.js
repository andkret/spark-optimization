// src/codegen.js
export function generateCode(config) {
  // Build the repartition line without nested backticks
  let repartitionLine;
  if (config.partitionStrategy !== 'None') {
    const numPartitions = config.partitionStrategy === 'Good' ? 4 : 1;
    repartitionLine = 'df = df.repartition(' + numPartitions + ')';
  } else {
    repartitionLine = '# No explicit repartition';
  }

  // Build the join line (broadcast vs. shuffle) without nested backticks
  let joinBuildImport = '';
  if (config.joinType === 'Broadcast') {
    joinBuildImport = 'from pyspark.sql.functions import broadcast';
  }

  const joinExpression =
    config.joinType === 'Broadcast'
      ? 'join(broadcast(df2)'
      : 'join(df2';

  return (
    '# Spark Simulation Code (Cluster: ' +
    config.clusterSize +
    ')\n' +
    '# Join: ' +
    config.joinPrimary +
    ' ⨝ ' +
    config.joinSecondary +
    ' on ' +
    config.joinKey +
    '\n' +
    'spark.conf.set("spark.sql.adaptive.enabled", ' +
    config.aqeEnabled +
    ')\n\n' +
    'df = spark.read.format("' +
    config.fileFormat.toLowerCase() +
    '").load("path/to/' +
    config.datasetSize.toLowerCase() +
    '_dataset")\n\n' +
    repartitionLine +
    '\n\n' +
    (config.useCache ? 'df.cache()\n\n' : '# Not cached\n\n') +
    'df2 = spark.read.parquet("dim_table")\n' +
    joinBuildImport +
    '\n\n' +
    'result = df.' +
    joinExpression +
    ' , "' +
    config.joinKey +
    '")\n\n' +
    'result.write.mode("overwrite").parquet("output")\n'
  );
}
