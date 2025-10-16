// StatusBar Component - Displays real-time telemetry
import { useEffect, useState } from 'react';
import { api, TelemetryMetrics } from '../lib/api';

export function StatusBar() {
  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    tokens_per_sec: 0,
    delta_score: 0,
    cache_hit_rate: 0,
    robust_pct: 0,
    memory_use_mb: 0,
    module_status: {},
  });

  const [isLoading, setIsLoading] = useState(false);

  // Poll telemetry every second
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        setIsLoading(true);
        const latest = await api.getTelemetryMetrics();
        setMetrics(latest);
      } catch (err) {
        console.error('Failed to fetch telemetry:', err);
      } finally {
        setIsLoading(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar">
      <div className="status-metric">
        <div className="metric-label">Tokens/sec</div>
        <div className="metric-value">{metrics.tokens_per_sec.toFixed(1)}</div>
      </div>

      <div className="status-metric">
        <div className="metric-label">ΔScore</div>
        <div className="metric-value" style={{ color: metrics.delta_score >= 0 ? '#00E676' : '#FF1744' }}>
          {metrics.delta_score >= 0 ? '+' : ''}{metrics.delta_score.toFixed(1)}
        </div>
      </div>

      <div className="status-metric">
        <div className="metric-label">Cache Hit</div>
        <div className="metric-value">{(metrics.cache_hit_rate * 100).toFixed(0)}%</div>
      </div>

      <div className="status-metric">
        <div className="metric-label">Robust</div>
        <div className="metric-value">{metrics.robust_pct.toFixed(0)}%</div>
      </div>

      <div className="status-metric">
        <div className="metric-label">Memory</div>
        <div className="metric-value">{metrics.memory_use_mb.toFixed(0)} MB</div>
      </div>

      {isLoading && <div className="spinner" style={{ width: 16, height: 16 }} />}
    </div>
  );
}
