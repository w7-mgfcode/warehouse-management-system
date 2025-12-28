"""
Prometheus metrics for WMS application monitoring.

Tracks:
- HTTP request metrics (count, duration)
- Inventory metrics (stock levels, expiry warnings)
- System health metrics (DB connections, task queue)
"""

from prometheus_client import Counter, Histogram, Gauge, Info
from typing import Optional

# Application info
app_info = Info("wms_app", "WMS application information")
app_info.info({"version": "1.0.0", "phase": "6"})

# HTTP request metrics
http_requests_total = Counter(
    "wms_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

http_request_duration_seconds = Histogram(
    "wms_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# Inventory metrics
inventory_stock_total = Gauge(
    "wms_inventory_stock_total",
    "Total inventory stock quantity",
    ["warehouse_id", "product_id"],
)

inventory_expiry_warnings_total = Gauge(
    "wms_inventory_expiry_warnings_total",
    "Total number of expiry warnings",
    ["urgency"],  # critical, warning, info
)

inventory_expired_items_total = Gauge(
    "wms_inventory_expired_items_total",
    "Total number of expired inventory items",
    ["warehouse_id"],
)

inventory_movements_total = Counter(
    "wms_inventory_movements_total",
    "Total inventory movements",
    ["type", "warehouse_id"],  # type: receipt, issue, adjust, scrap, transfer
)

# Transfer metrics
transfers_total = Counter(
    "wms_transfers_total",
    "Total warehouse transfers",
    ["status"],  # pending, dispatched, confirmed, cancelled
)

transfer_duration_seconds = Histogram(
    "wms_transfer_duration_seconds",
    "Transfer completion duration in seconds",
    ["from_warehouse", "to_warehouse"],
    buckets=(60, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400),
)

# Reservation metrics
reservations_total = Counter(
    "wms_reservations_total",
    "Total stock reservations",
    ["status"],  # pending, fulfilled, cancelled
)

reservations_active = Gauge(
    "wms_reservations_active",
    "Number of active reservations",
    ["warehouse_id"],
)

# Database metrics
db_connections_active = Gauge(
    "wms_db_connections_active",
    "Number of active database connections",
)

db_query_duration_seconds = Histogram(
    "wms_db_query_duration_seconds",
    "Database query duration in seconds",
    ["query_type"],  # select, insert, update, delete
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)

# Celery task metrics
celery_tasks_total = Counter(
    "wms_celery_tasks_total",
    "Total Celery tasks",
    ["task_name", "status"],  # success, failure, retry
)

celery_task_duration_seconds = Histogram(
    "wms_celery_task_duration_seconds",
    "Celery task duration in seconds",
    ["task_name"],
    buckets=(0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 300.0, 600.0),
)

celery_queue_length = Gauge(
    "wms_celery_queue_length",
    "Number of tasks in Celery queue",
    ["queue_name"],
)

# Authentication metrics
auth_attempts_total = Counter(
    "wms_auth_attempts_total",
    "Total authentication attempts",
    ["result"],  # success, failure
)

active_sessions = Gauge(
    "wms_active_sessions",
    "Number of active user sessions",
)

# Error metrics
errors_total = Counter(
    "wms_errors_total",
    "Total application errors",
    ["error_type", "severity"],  # severity: low, medium, high, critical
)


def track_http_request(method: str, endpoint: str, status_code: int, duration: float) -> None:
    """
    Track HTTP request metrics.

    Args:
        method (str): HTTP method (GET, POST, etc.)
        endpoint (str): API endpoint path
        status_code (int): HTTP status code
        duration (float): Request duration in seconds
    """
    http_requests_total.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
    http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)


def track_inventory_movement(
    movement_type: str, warehouse_id: str, quantity: int = 1
) -> None:
    """
    Track inventory movement.

    Args:
        movement_type (str): Movement type (receipt, issue, adjust, scrap, transfer)
        warehouse_id (str): Warehouse UUID
        quantity (int): Movement quantity (default: 1)
    """
    inventory_movements_total.labels(type=movement_type, warehouse_id=warehouse_id).inc(
        quantity
    )


def update_stock_level(warehouse_id: str, product_id: str, quantity: int) -> None:
    """
    Update stock level gauge.

    Args:
        warehouse_id (str): Warehouse UUID
        product_id (str): Product UUID
        quantity (int): Current stock quantity
    """
    inventory_stock_total.labels(warehouse_id=warehouse_id, product_id=product_id).set(quantity)


def update_expiry_warnings(urgency: str, count: int) -> None:
    """
    Update expiry warning gauge.

    Args:
        urgency (str): Urgency level (critical, warning, info)
        count (int): Number of warnings at this urgency level
    """
    inventory_expiry_warnings_total.labels(urgency=urgency).set(count)


def track_transfer(status: str, from_warehouse: Optional[str] = None, to_warehouse: Optional[str] = None, duration: Optional[float] = None) -> None:
    """
    Track warehouse transfer metrics.

    Args:
        status (str): Transfer status (pending, dispatched, confirmed, cancelled)
        from_warehouse (str, optional): Source warehouse UUID
        to_warehouse (str, optional): Destination warehouse UUID
        duration (float, optional): Transfer duration in seconds
    """
    transfers_total.labels(status=status).inc()

    if duration and from_warehouse and to_warehouse:
        transfer_duration_seconds.labels(
            from_warehouse=from_warehouse, to_warehouse=to_warehouse
        ).observe(duration)


def track_reservation(status: str, warehouse_id: Optional[str] = None) -> None:
    """
    Track reservation metrics.

    Args:
        status (str): Reservation status (pending, fulfilled, cancelled)
        warehouse_id (str, optional): Warehouse UUID
    """
    reservations_total.labels(status=status).inc()


def update_active_reservations(warehouse_id: str, count: int) -> None:
    """
    Update active reservation count.

    Args:
        warehouse_id (str): Warehouse UUID
        count (int): Number of active reservations
    """
    reservations_active.labels(warehouse_id=warehouse_id).set(count)


def track_celery_task(task_name: str, status: str, duration: Optional[float] = None) -> None:
    """
    Track Celery task metrics.

    Args:
        task_name (str): Task name
        status (str): Task status (success, failure, retry)
        duration (float, optional): Task duration in seconds
    """
    celery_tasks_total.labels(task_name=task_name, status=status).inc()

    if duration:
        celery_task_duration_seconds.labels(task_name=task_name).observe(duration)


def track_auth_attempt(result: str) -> None:
    """
    Track authentication attempt.

    Args:
        result (str): Result (success, failure)
    """
    auth_attempts_total.labels(result=result).inc()


def track_error(error_type: str, severity: str = "medium") -> None:
    """
    Track application error.

    Args:
        error_type (str): Error type or exception class name
        severity (str): Severity level (low, medium, high, critical)
    """
    errors_total.labels(error_type=error_type, severity=severity).inc()
