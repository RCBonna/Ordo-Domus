import { useCallback, useEffect, useState } from 'react';
import { logger } from '../lib/logger';
import { fetchDashboardMetrics } from '../repositories/dashboardRepository';
import type { DashboardMetrics } from '../types/domain';

export function useDashboardMetrics(unidadeId: string | undefined, enabled: boolean) {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [isDashboardMetricsLoading, setIsDashboardMetricsLoading] = useState(false);
  const [dashboardMetricsError, setDashboardMetricsError] = useState<string | null>(null);

  const carregarDashboardMetrics = useCallback(async () => {
    if (!unidadeId || !enabled) return;

    setIsDashboardMetricsLoading(true);
    setDashboardMetricsError(null);

    try {
      const metrics = await fetchDashboardMetrics(unidadeId);
      setDashboardMetrics(metrics);
    } catch {
      logger.warn('Metricas server-side do dashboard indisponiveis; usando fallback local.');
      setDashboardMetrics(null);
      setDashboardMetricsError('Metricas server-side indisponiveis; usando fallback local.');
    } finally {
      setIsDashboardMetricsLoading(false);
    }
  }, [enabled, unidadeId]);

  useEffect(() => {
    if (!enabled) return;
    void carregarDashboardMetrics();
  }, [carregarDashboardMetrics, enabled]);

  useEffect(() => {
    if (!unidadeId) {
      setDashboardMetrics(null);
      setDashboardMetricsError(null);
    }
  }, [unidadeId]);

  return {
    dashboardMetrics,
    isDashboardMetricsLoading,
    dashboardMetricsError,
    carregarDashboardMetrics,
  };
}
