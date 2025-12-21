"""
QuickBooks Admin API Endpoints

Provides RESTful API endpoints for managing QuickBooks POS integration:
- Configuration management (credentials, sync settings)
- Sync control (manual triggers, status monitoring)
- Item and customer mappings
- Sync history and statistics

These endpoints are used by the admin dashboard to configure and monitor
the QuickBooks integration.

Author: Premier Hotel Management System
Date: December 18, 2025
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import asyncpg

from ....core.database import get_db_pool
from ....middleware.auth import require_admin
from ....services.quickbooks_sync import QuickBooksSyncService
from ....models.quickbooks import (
    QuickBooksConfig,
    QuickBooksConfigUpdate,
    QuickBooksSyncLog,
    QuickBooksItemMapping,
    QuickBooksItemMappingCreate,
    QuickBooksCustomerMapping,
    SyncStatus,
    ConnectionStatus,
)


router = APIRouter(prefix="/quickbooks", tags=["QuickBooks Admin"])


# ==================== Request/Response Models ====================

class ConfigResponse(BaseModel):
    """QuickBooks configuration response."""
    id: str
    company_file_path: str
    web_connector_url: str
    username: str
    sync_enabled: bool
    sync_sales: bool
    sync_inventory: bool
    inventory_sync_interval_minutes: int
    connection_status: str
    last_inventory_sync: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class TestConnectionResponse(BaseModel):
    """Test connection response."""
    success: bool
    message: str
    connection_status: str


class SyncStatusResponse(BaseModel):
    """Sync status summary."""
    sync_enabled: bool
    total_pending: int
    total_processing: int
    total_completed: int
    total_failed: int
    last_successful_sync: Optional[datetime]


class ManualSyncRequest(BaseModel):
    """Manual sync trigger request."""
    sync_type: str = Field(..., description="Type: 'sales', 'inventory', or 'all'")


class ManualSyncResponse(BaseModel):
    """Manual sync trigger response."""
    success: bool
    message: str
    triggered_syncs: int


class SyncLogResponse(BaseModel):
    """Sync log entry response."""
    id: str
    sync_type: str
    sync_direction: str
    reference_type: str
    reference_id: str
    qb_txn_id: Optional[str]
    status: str
    error_message: Optional[str]
    retry_count: int
    synced_at: Optional[datetime]
    created_at: datetime


class PaginatedSyncLogsResponse(BaseModel):
    """Paginated sync logs response."""
    logs: List[SyncLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ItemMappingResponse(BaseModel):
    """Item mapping response."""
    id: str
    hotel_item_id: str
    hotel_item_type: str
    hotel_item_name: Optional[str]
    qb_item_list_id: str
    qb_item_full_name: str
    sync_inventory: bool
    created_at: datetime
    updated_at: datetime


class CustomerMappingResponse(BaseModel):
    """Customer mapping response."""
    id: str
    user_id: str
    user_email: Optional[str]
    user_name: Optional[str]
    qb_customer_list_id: str
    qb_customer_name: str
    created_at: datetime


# ==================== Configuration Endpoints ====================

@router.get("/config", response_model=ConfigResponse)
async def get_config(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Get QuickBooks configuration.

    Returns the current QuickBooks integration configuration including
    connection settings and sync preferences.

    Requires: Admin role

    Returns:
        ConfigResponse: Current QB configuration
    """
    async with db_pool.acquire() as conn:
        config = await conn.fetchrow(
            """
            SELECT * FROM quickbooks_config
            ORDER BY created_at DESC
            LIMIT 1
            """
        )

        if not config:
            raise HTTPException(status_code=404, detail="QuickBooks configuration not found")

        return dict(config)


@router.post("/config", response_model=ConfigResponse)
async def create_or_update_config(
    config_data: QuickBooksConfigUpdate,
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Create or update QuickBooks configuration.

    Updates QB connection settings, credentials, and sync preferences.
    Password is hashed before storage.

    Requires: Admin role

    Args:
        config_data: Configuration data to update

    Returns:
        ConfigResponse: Updated QB configuration
    """
    async with db_pool.acquire() as conn:
        # Check if config exists
        existing_config = await conn.fetchrow(
            """
            SELECT id FROM quickbooks_config
            ORDER BY created_at DESC
            LIMIT 1
            """
        )

        # Hash password if provided
        password_hash = None
        if config_data.password:
            password_hash = hashlib.sha256(config_data.password.encode()).hexdigest()

        if existing_config:
            # Update existing config
            update_fields = []
            update_values = []
            param_index = 1

            if config_data.company_file_path is not None:
                update_fields.append(f"company_file_path = ${param_index}")
                update_values.append(config_data.company_file_path)
                param_index += 1

            if config_data.web_connector_url is not None:
                update_fields.append(f"web_connector_url = ${param_index}")
                update_values.append(config_data.web_connector_url)
                param_index += 1

            if config_data.username is not None:
                update_fields.append(f"username = ${param_index}")
                update_values.append(config_data.username)
                param_index += 1

            if password_hash:
                update_fields.append(f"password_hash = ${param_index}")
                update_values.append(password_hash)
                param_index += 1

            if config_data.sync_enabled is not None:
                update_fields.append(f"sync_enabled = ${param_index}")
                update_values.append(config_data.sync_enabled)
                param_index += 1

            if config_data.sync_sales is not None:
                update_fields.append(f"sync_sales = ${param_index}")
                update_values.append(config_data.sync_sales)
                param_index += 1

            if config_data.sync_inventory is not None:
                update_fields.append(f"sync_inventory = ${param_index}")
                update_values.append(config_data.sync_inventory)
                param_index += 1

            if config_data.inventory_sync_interval_minutes is not None:
                update_fields.append(f"inventory_sync_interval_minutes = ${param_index}")
                update_values.append(config_data.inventory_sync_interval_minutes)
                param_index += 1

            update_fields.append(f"updated_at = ${param_index}")
            update_values.append(datetime.utcnow())
            param_index += 1

            update_values.append(existing_config['id'])

            query = f"""
                UPDATE quickbooks_config
                SET {', '.join(update_fields)}
                WHERE id = ${param_index}
                RETURNING *
            """

            config = await conn.fetchrow(query, *update_values)

        else:
            # Create new config
            if not all([
                config_data.company_file_path,
                config_data.web_connector_url,
                config_data.username,
                password_hash
            ]):
                raise HTTPException(
                    status_code=400,
                    detail="company_file_path, web_connector_url, username, and password are required"
                )

            config_id = uuid4()
            config = await conn.fetchrow(
                """
                INSERT INTO quickbooks_config (
                    id, company_file_path, web_connector_url, username, password_hash,
                    sync_enabled, sync_sales, sync_inventory, inventory_sync_interval_minutes,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
                RETURNING *
                """,
                config_id,
                config_data.company_file_path,
                config_data.web_connector_url,
                config_data.username,
                password_hash,
                config_data.sync_enabled or False,
                config_data.sync_sales or True,
                config_data.sync_inventory or True,
                config_data.inventory_sync_interval_minutes or 60,
                datetime.utcnow()
            )

        return dict(config)


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Test QuickBooks connection.

    Attempts to verify that QuickBooks is accessible with current configuration.
    Note: Actual connection testing requires QB Web Connector to be running.

    Requires: Admin role

    Returns:
        TestConnectionResponse: Connection test result
    """
    async with db_pool.acquire() as conn:
        config = await conn.fetchrow(
            """
            SELECT * FROM quickbooks_config
            ORDER BY created_at DESC
            LIMIT 1
            """
        )

        if not config:
            return TestConnectionResponse(
                success=False,
                message="QuickBooks configuration not found",
                connection_status=ConnectionStatus.DISCONNECTED.value
            )

        if not config['sync_enabled']:
            return TestConnectionResponse(
                success=False,
                message="QuickBooks sync is not enabled",
                connection_status=ConnectionStatus.DISCONNECTED.value
            )

        # In a real implementation, you would attempt to connect to QB
        # For now, we just verify configuration is complete
        is_configured = all([
            config['company_file_path'],
            config['web_connector_url'],
            config['username'],
            config['password_hash']
        ])

        if is_configured:
            # Update connection status
            await conn.execute(
                """
                UPDATE quickbooks_config
                SET connection_status = $1, updated_at = $2
                WHERE id = $3
                """,
                ConnectionStatus.CONNECTED.value,
                datetime.utcnow(),
                config['id']
            )

            return TestConnectionResponse(
                success=True,
                message="QuickBooks configuration is valid. Start Web Connector to begin sync.",
                connection_status=ConnectionStatus.CONNECTED.value
            )
        else:
            return TestConnectionResponse(
                success=False,
                message="QuickBooks configuration is incomplete",
                connection_status=ConnectionStatus.ERROR.value
            )


# ==================== Sync Management Endpoints ====================

@router.post("/sync/manual", response_model=ManualSyncResponse)
async def manual_sync(
    request: ManualSyncRequest,
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Trigger manual synchronization.

    Manually triggers sync for sales, inventory, or all data.
    Actual sync execution happens when QB Web Connector polls.

    Requires: Admin role

    Args:
        request: Sync type specification

    Returns:
        ManualSyncResponse: Sync trigger result
    """
    sync_service = QuickBooksSyncService(db_pool)

    if request.sync_type == "inventory":
        # Trigger inventory sync from QB
        sync_logs = await sync_service.sync_inventory_from_qb()
        return ManualSyncResponse(
            success=True,
            message=f"Inventory sync triggered for {len(sync_logs)} items",
            triggered_syncs=len(sync_logs)
        )

    elif request.sync_type == "sales":
        # Manual sales sync would need order/booking IDs
        # For now, return info message
        return ManualSyncResponse(
            success=True,
            message="Sales sync triggered automatically when orders/bookings complete",
            triggered_syncs=0
        )

    elif request.sync_type == "all":
        # Trigger inventory sync
        sync_logs = await sync_service.sync_inventory_from_qb()
        return ManualSyncResponse(
            success=True,
            message=f"Full sync triggered. {len(sync_logs)} inventory items queued.",
            triggered_syncs=len(sync_logs)
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sync type: {request.sync_type}. Use 'sales', 'inventory', or 'all'"
        )


@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Get current sync status and statistics.

    Returns real-time sync statistics including pending, processing,
    completed, and failed sync counts.

    Requires: Admin role

    Returns:
        SyncStatusResponse: Current sync status
    """
    async with db_pool.acquire() as conn:
        # Get sync enabled status
        config = await conn.fetchrow(
            """
            SELECT sync_enabled FROM quickbooks_config
            ORDER BY created_at DESC
            LIMIT 1
            """
        )

        sync_enabled = config['sync_enabled'] if config else False

        # Get sync statistics
        stats = await conn.fetchrow(
            """
            SELECT
                COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
                COUNT(*) FILTER (WHERE status = 'processing') as total_processing,
                COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
                COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
                MAX(synced_at) FILTER (WHERE status = 'completed') as last_successful_sync
            FROM quickbooks_sync_log
            """
        )

        return SyncStatusResponse(
            sync_enabled=sync_enabled,
            total_pending=stats['total_pending'] or 0,
            total_processing=stats['total_processing'] or 0,
            total_completed=stats['total_completed'] or 0,
            total_failed=stats['total_failed'] or 0,
            last_successful_sync=stats['last_successful_sync']
        )


@router.get("/sync/logs", response_model=PaginatedSyncLogsResponse)
async def get_sync_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    sync_type: Optional[str] = Query(None, description="Filter by sync type"),
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Get paginated sync history logs.

    Returns sync transaction history with optional filtering by status
    and sync type.

    Requires: Admin role

    Args:
        page: Page number (1-indexed)
        page_size: Number of items per page
        status: Filter by status (optional)
        sync_type: Filter by sync type (optional)

    Returns:
        PaginatedSyncLogsResponse: Paginated sync logs
    """
    async with db_pool.acquire() as conn:
        # Build WHERE clause
        where_conditions = []
        where_params = []
        param_index = 1

        if status:
            where_conditions.append(f"status = ${param_index}")
            where_params.append(status)
            param_index += 1

        if sync_type:
            where_conditions.append(f"sync_type = ${param_index}")
            where_params.append(sync_type)
            param_index += 1

        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""

        # Get total count
        count_query = f"SELECT COUNT(*) FROM quickbooks_sync_log {where_clause}"
        total = await conn.fetchval(count_query, *where_params)

        # Get paginated logs
        offset = (page - 1) * page_size
        where_params.extend([page_size, offset])

        logs_query = f"""
            SELECT * FROM quickbooks_sync_log
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_index} OFFSET ${param_index + 1}
        """

        rows = await conn.fetch(logs_query, *where_params)
        logs = [SyncLogResponse(**dict(row)) for row in rows]

        total_pages = (total + page_size - 1) // page_size

        return PaginatedSyncLogsResponse(
            logs=logs,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )


@router.post("/sync/retry/{log_id}", response_model=SyncLogResponse)
async def retry_sync(
    log_id: str,
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Retry a failed sync transaction.

    Requeues a failed sync for retry by the Web Connector.

    Requires: Admin role

    Args:
        log_id: UUID of the failed sync log

    Returns:
        SyncLogResponse: Updated sync log
    """
    sync_service = QuickBooksSyncService(db_pool)

    try:
        sync_log = await sync_service.retry_failed_sync(log_id)
        return SyncLogResponse(**sync_log)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Mapping Endpoints ====================

@router.get("/mappings/items", response_model=List[ItemMappingResponse])
async def get_item_mappings(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Get all QuickBooks item mappings.

    Returns mappings between hotel menu/inventory items and QB items.

    Requires: Admin role

    Returns:
        List[ItemMappingResponse]: All item mappings
    """
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                qm.*,
                COALESCE(mi.name, ii.name) as hotel_item_name
            FROM quickbooks_item_mapping qm
            LEFT JOIN menu_items mi ON mi.id = qm.hotel_item_id AND qm.hotel_item_type = 'menu_item'
            LEFT JOIN inventory_items ii ON ii.id = qm.hotel_item_id AND qm.hotel_item_type = 'inventory_item'
            ORDER BY qm.created_at DESC
            """
        )

        return [ItemMappingResponse(**dict(row)) for row in rows]


@router.post("/mappings/items", response_model=ItemMappingResponse)
async def create_item_mapping(
    mapping_data: QuickBooksItemMappingCreate,
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Create a new QuickBooks item mapping.

    Maps a hotel menu or inventory item to a QuickBooks item.

    Requires: Admin role

    Args:
        mapping_data: Item mapping data

    Returns:
        ItemMappingResponse: Created item mapping
    """
    async with db_pool.acquire() as conn:
        mapping_id = uuid4()

        # Create mapping
        mapping = await conn.fetchrow(
            """
            INSERT INTO quickbooks_item_mapping (
                id, hotel_item_id, hotel_item_type, qb_item_list_id,
                qb_item_full_name, sync_inventory, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
            RETURNING *
            """,
            mapping_id,
            UUID(mapping_data.hotel_item_id),
            mapping_data.hotel_item_type,
            mapping_data.qb_item_list_id,
            mapping_data.qb_item_full_name,
            mapping_data.sync_inventory,
            datetime.utcnow()
        )

        # Fetch with item name
        result = await conn.fetchrow(
            """
            SELECT
                qm.*,
                COALESCE(mi.name, ii.name) as hotel_item_name
            FROM quickbooks_item_mapping qm
            LEFT JOIN menu_items mi ON mi.id = qm.hotel_item_id AND qm.hotel_item_type = 'menu_item'
            LEFT JOIN inventory_items ii ON ii.id = qm.hotel_item_id AND qm.hotel_item_type = 'inventory_item'
            WHERE qm.id = $1
            """,
            mapping_id
        )

        return ItemMappingResponse(**dict(result))


@router.delete("/mappings/items/{mapping_id}")
async def delete_item_mapping(
    mapping_id: str,
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Delete a QuickBooks item mapping.

    Requires: Admin role

    Args:
        mapping_id: UUID of the mapping to delete

    Returns:
        Success message
    """
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            """
            DELETE FROM quickbooks_item_mapping
            WHERE id = $1
            """,
            UUID(mapping_id)
        )

        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Mapping not found")

        return {"message": "Item mapping deleted successfully"}


@router.get("/mappings/customers", response_model=List[CustomerMappingResponse])
async def get_customer_mappings(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(require_admin)
):
    """
    Get all QuickBooks customer mappings.

    Returns mappings between hotel users and QB customers.

    Requires: Admin role

    Returns:
        List[CustomerMappingResponse]: All customer mappings
    """
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                qcm.*,
                u.email as user_email,
                u.full_name as user_name
            FROM quickbooks_customer_mapping qcm
            LEFT JOIN auth.users u ON u.id = qcm.user_id
            ORDER BY qcm.created_at DESC
            """
        )

        return [CustomerMappingResponse(**dict(row)) for row in rows]
