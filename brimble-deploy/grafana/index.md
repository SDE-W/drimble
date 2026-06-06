Grafana Folders
│
├── HTTP/
│   └── RED Dashboard
│       ├── [Time series] Request Rate
│       │     rate(brimble_http_requests_total[1m])
│       │
│       ├── [Time series] Request Rate by Route
│       │     rate(brimble_http_requests_total[1m]) by (route, method)
│       │
│       ├── [Time series] Error Rate %
│       │     rate(brimble_http_errors_total[1m]) / rate(brimble_http_requests_total[1m]) * 100
│       │
│       ├── [Time series] p50 / p95 / p99 Latency
│       │     histogram_quantile(0.50, ...)
│       │     histogram_quantile(0.95, ...)
│       │     histogram_quantile(0.99, ...)
│       │
│       ├── [Bar chart]   Requests by Status Code
│       │     sum(brimble_http_requests_total) by (status_code)
│       │
│       ├── [Bar chart]   Requests per Route
│       │     sum(rate(brimble_http_requests_total[5m])) by (route)
│       │
│       └── [Time series] Average Request Duration
│             rate(brimble_http_request_duration_seconds_sum[5m])
│             / rate(brimble_http_request_duration_seconds_count[5m])
│
│
├── Pipeline/
│   └── Pipeline Overview
│       ├── [Time series] Phase Duration p95
│       │     histogram_quantile(0.95, sum(rate(brimble_pipeline_duration_seconds_bucket[10m])) by (le, phase))
│       │
│       ├── [Time series] Phase Duration Average
│       │     rate(brimble_pipeline_duration_seconds_sum[10m])
│       │     / rate(brimble_pipeline_duration_seconds_count[10m])
│       │
│       ├── [Time series] Pipeline Error Rate by Phase
│       │     rate(brimble_pipeline_errors_total[5m])
│       │
│       ├── [Bar chart]   Pipeline Errors by Phase
│       │     sum(brimble_pipeline_errors_total) by (phase)
│       │
│       ├── [Stat panel]  Total Completions by Phase and Status
│       │     sum(brimble_pipeline_duration_seconds_count) by (phase, status)
│       │
│       ├── [Gauge]       Pipeline Success Ratio by Phase
│       │     sum(brimble_pipeline_duration_seconds_count{status="success"}) by (phase)
│       │     / sum(brimble_pipeline_duration_seconds_count) by (phase)
│       │
│       ├── [Stat panel]  Build Phase Error Count
│       │     brimble_pipeline_errors_total{phase="build"}
│       │
│       └── [Time series] Clone Phase Average Duration
│             rate(brimble_pipeline_duration_seconds_sum{phase="clone"}[10m])
│             / rate(brimble_pipeline_duration_seconds_count{phase="clone"}[10m])
│
│
├── Database/
│   └── DB Query Metrics
│       ├── [Time series] Query Duration p95 by Operation
│       │     histogram_quantile(0.95, sum(rate(brimble_db_query_duration_seconds_bucket[5m])) by (le, operation, domain))
│       │
│       ├── [Time series] Query Duration Average
│       │     rate(brimble_db_query_duration_seconds_sum[5m])
│       │     / rate(brimble_db_query_duration_seconds_count[5m])
│       │
│       ├── [Time series] Query Error Rate
│       │     rate(brimble_db_query_errors_total[5m])
│       │
│       ├── [Bar chart]   Errors by Operation and Domain
│       │     sum(brimble_db_query_errors_total) by (operation, domain)
│       │
│       └── [Alert panel] Slow Queries > 1s
│             histogram_quantile(0.99, rate(brimble_db_query_duration_seconds_bucket[5m])) > 1
│
│
├── Infrastructure/
│   ├── Process Health
│   │   ├── [Time series] CPU Usage
│   │   │     rate(brimble_process_cpu_seconds_total[1m])
│   │   │
│   │   ├── [Gauge]       Heap Utilisation %
│   │   │     brimble_nodejs_heap_size_used_bytes / brimble_nodejs_heap_size_total_bytes * 100
│   │   │
│   │   ├── [Time series] Heap Used vs Total (MB)
│   │   │     brimble_nodejs_heap_size_used_bytes / 1024 / 1024
│   │   │     brimble_nodejs_heap_size_total_bytes / 1024 / 1024
│   │   │
│   │   ├── [Stat panel]  Resident Memory (MB)
│   │   │     brimble_process_resident_memory_bytes / 1024 / 1024
│   │   │
│   │   ├── [Time series] Event Loop Lag
│   │   │     rate(brimble_nodejs_eventloop_lag_seconds[1m])
│   │   │
│   │   ├── [Time series] GC Duration by Type
│   │   │     rate(brimble_nodejs_gc_duration_seconds_sum[5m]) by (kind)
│   │   │
│   │   ├── [Stat panel]  Open File Descriptors
│   │   │     brimble_process_open_fds
│   │   │
│   │   ├── [Stat panel]  Active Handles
│   │   │     brimble_nodejs_active_handles_total
│   │   │
│   │   └── [Stat panel]  Uptime
│   │         time() - brimble_process_start_time_seconds
│   │
│   └── Worker Consumers
│       ├── [Time series] Task Throughput by Topic
│       │     rate(brimble_worker_tasks_total[1m]) by (topic)
│       │
│       ├── [Time series] Worker Error Rate by Topic
│       │     rate(brimble_worker_errors_total[1m]) by (topic)
│       │
│       └── [Gauge]       Queue Depth by Topic
│             brimble_worker_queue_depth by (topic)
│
│
├── Errors/
│   └── Error Tracking
│       ├── [Time series] Error Rate by Domain
│       │     rate(brimble_errors_total[5m]) by (domain)
│       │
│       ├── [Bar chart]   Errors by Severity
│       │     sum(brimble_errors_total) by (severity)
│       │
│       ├── [Time series] Critical Error Rate
│       │     rate(brimble_errors_total{severity="critical"}[5m])
│       │
│       └── [Bar chart]   High + Critical Errors by Domain
│             sum(brimble_errors_total{severity=~"high|critical"}) by (domain, operation)
│
│
├── Service/
│   └── Service Health
│       ├── [Stat panel]  Health Status
│       │     brimble_service_health
│       │
│       ├── [Stat panel]  Init Success by Component
│       │     sum(brimble_service_init_attempts_total{status="success"}) by (component)
│       │
│       ├── [Bar chart]   Init Failures by Component
│       │     sum(brimble_service_init_attempts_total{status="error"}) by (component)
│       │
│       └── [Time series] Init Duration p95 by Component
│             histogram_quantile(0.95, rate(brimble_service_init_duration_seconds_bucket[10m])) by (component)
│
│
└── Logs/
    └── Logs Dashboard
        ├── [Logs panel]  Pipeline Runner Failures
        │     {service="brimble-api", event="pipeline_runner_failed"}
        │
        ├── [Logs panel]  Pipeline Completed
        │     {service="brimble-api", event="pipeline_runner_completed"}
        │
        ├── [Logs panel]  HTTP Errors
        │     {service="brimble-api", level="error", event="http_request"}
        │
        ├── [Logs panel]  Deployment Domain
        │     {service="brimble-api", domain="deployment"}
        │
        ├── [Logs panel]  Dead Letter Domain
        │     {service="brimble-api", domain="dead-letter"}
        │
        └── [Logs panel]  All Errors
              {service="brimble-api", level="error"}