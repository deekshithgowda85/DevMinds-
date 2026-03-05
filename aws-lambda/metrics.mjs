// ─── DevMind Lambda: CloudWatch Custom Metrics ───────────────────────────────
// Logs operational metrics for hackathon judging visibility

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const REGION = process.env.AWS_REGION || 'us-east-1';
const NAMESPACE = 'DevMind';

const cwClient = new CloudWatchClient({ region: REGION });

/**
 * Put a single metric data point to CloudWatch
 */
async function putMetric(metricName, value, unit = 'Count') {
  try {
    await cwClient.send(new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date()
      }]
    }));
  } catch (err) {
    // Non-fatal — don't fail the request over metrics
    console.warn(`[Metrics] Failed to put ${metricName}:`, err.message);
  }
}

/**
 * Log a full request's metrics in one call
 */
export async function logRequestMetrics({ cacheHit, bedrockCalled, modelUpgraded, latencyMs, actionType }) {
  const promises = [
    putMetric('TotalRequests', 1),
    putMetric(cacheHit ? 'CacheHits' : 'CacheMisses', 1),
  ];

  if (bedrockCalled) promises.push(putMetric('BedrockCalls', 1));
  if (modelUpgraded) promises.push(putMetric('ModelUpgrades', 1));
  if (latencyMs) promises.push(putMetric('ResponseLatency', latencyMs, 'Milliseconds'));
  if (actionType) promises.push(putMetric(`ActionType_${actionType}`, 1));

  await Promise.allSettled(promises);
}
