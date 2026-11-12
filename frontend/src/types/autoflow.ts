export interface BackendIncident {
  incident_id: string;
  service_name: string;
  metric_type: string;
  metric_value: number;
  threshold: number;
  status: string;
  created_at: string;
}

export interface BackendWeight {
  agent_name: string;
  weight?: number;
  current_weight?: number | string;
  initial_weight?: number | string;
  accuracy_rate?: number | string;
  confidence?: number;
}

export interface DashboardMetrics {
  total_incidents: number;
  active_incidents: number;
  resolved_incidents: number;
  avg_resolution_time_sec: number;
}
