"""
QuickBooks Web Connector SOAP Endpoint

Implements the SOAP-based QuickBooks Web Connector protocol for communication
with QuickBooks POS 2013. This endpoint acts as the bridge between the QB Web
Connector application and the Premier Hotel system.

The Web Connector protocol requires specific SOAP methods to be implemented
in a defined sequence for each sync session.

Protocol Flow:
1. authenticate() - Validate credentials and start session
2. sendRequestXML() - Send pending QBXML requests to QB
3. receiveResponseXML() - Receive and process QB responses
4. closeConnection() - End session gracefully
5. connectionError() - Handle connection failures

Author: Premier Hotel Management System
Date: December 18, 2025
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import Response
from pydantic import BaseModel
import asyncpg

from ....core.database import get_db_pool
from ....services.quickbooks_sync import QuickBooksSyncService
from ....models.quickbooks import SyncStatus


router = APIRouter(prefix="/quickbooks-connector", tags=["QuickBooks Web Connector"])


# ==================== SOAP Request/Response Models ====================

class SOAPEnvelope(BaseModel):
    """Base SOAP envelope structure."""
    pass


class AuthenticateRequest(BaseModel):
    """SOAP authenticate request."""
    strUserName: str
    strPassword: str


class SendRequestXMLRequest(BaseModel):
    """SOAP sendRequestXML request."""
    ticket: str
    strHCPResponse: str
    strCompanyFileName: str
    qbXMLCountry: str
    qbXMLMajorVers: int
    qbXMLMinorVers: int


class ReceiveResponseXMLRequest(BaseModel):
    """SOAP receiveResponseXML request."""
    ticket: str
    response: str
    hresult: str
    message: str


class CloseConnectionRequest(BaseModel):
    """SOAP closeConnection request."""
    ticket: str


class ConnectionErrorRequest(BaseModel):
    """SOAP connectionError request."""
    ticket: str
    hresult: str
    message: str


# ==================== Session Management ====================

class SessionManager:
    """
    Manages Web Connector session tickets and state.

    Each QB Web Connector session is assigned a unique ticket that is used
    to track requests/responses throughout the session lifecycle.
    """

    def __init__(self):
        self.sessions: dict[str, dict] = {}

    def create_session(self, username: str, company_file: str) -> str:
        """Create a new session and return ticket."""
        ticket = secrets.token_hex(32)
        self.sessions[ticket] = {
            "username": username,
            "company_file": company_file,
            "created_at": datetime.utcnow(),
            "current_request_index": 0,
            "pending_requests": [],
        }
        return ticket

    def get_session(self, ticket: str) -> Optional[dict]:
        """Retrieve session by ticket."""
        return self.sessions.get(ticket)

    def close_session(self, ticket: str) -> None:
        """Close and remove session."""
        if ticket in self.sessions:
            del self.sessions[ticket]


# Global session manager
session_manager = SessionManager()


# ==================== SOAP Helper Functions ====================

def create_soap_response(body: str) -> str:
    """
    Create SOAP envelope response.

    Args:
        body: SOAP body content

    Returns:
        Complete SOAP XML response
    """
    return f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <soap:Body>
        {body}
    </soap:Body>
</soap:Envelope>"""


async def verify_credentials(
    username: str,
    password: str,
    db_pool: asyncpg.Pool
) -> bool:
    """
    Verify QuickBooks Web Connector credentials.

    Args:
        username: QB username from config
        password: QB password (plaintext)
        db_pool: Database connection pool

    Returns:
        True if credentials are valid
    """
    async with db_pool.acquire() as conn:
        config = await conn.fetchrow(
            """
            SELECT username, password_hash
            FROM quickbooks_config
            WHERE sync_enabled = true
            ORDER BY created_at DESC
            LIMIT 1
            """
        )

        if not config:
            return False

        if config['username'] != username:
            return False

        # Verify password hash
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return config['password_hash'] == password_hash


# ==================== SOAP Endpoint Methods ====================

@router.post("/soap", response_class=Response)
async def soap_endpoint(
    request_body: str = "",
    soap_action: str = Header(None, alias="SOAPAction"),
    db_pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Main SOAP endpoint for QuickBooks Web Connector.

    Handles all SOAP method calls based on SOAPAction header.

    Args:
        request_body: SOAP XML request body
        soap_action: SOAP action header (method name)
        db_pool: Database connection pool

    Returns:
        SOAP XML response
    """
    # Extract method name from SOAPAction header
    # Example: "http://developer.intuit.com/authenticate" -> "authenticate"
    method = soap_action.split("/")[-1].strip('"') if soap_action else ""

    # Route to appropriate handler
    if method == "serverVersion":
        return await handle_server_version()
    elif method == "clientVersion":
        return await handle_client_version(request_body)
    elif method == "authenticate":
        return await handle_authenticate(request_body, db_pool)
    elif method == "sendRequestXML":
        return await handle_send_request_xml(request_body, db_pool)
    elif method == "receiveResponseXML":
        return await handle_receive_response_xml(request_body, db_pool)
    elif method == "closeConnection":
        return await handle_close_connection(request_body)
    elif method == "connectionError":
        return await handle_connection_error(request_body, db_pool)
    elif method == "getLastError":
        return await handle_get_last_error(request_body)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown SOAP method: {method}")


async def handle_server_version() -> Response:
    """
    Handle serverVersion SOAP request.

    Returns the Web Connector server version.

    Returns:
        SOAP response with version string
    """
    body = """
        <serverVersionResponse xmlns="http://developer.intuit.com/">
            <serverVersionResult>1.0.0</serverVersionResult>
        </serverVersionResponse>
    """
    return Response(content=create_soap_response(body), media_type="text/xml")


async def handle_client_version(request_body: str) -> Response:
    """
    Handle clientVersion SOAP request.

    Validates the QB Web Connector client version.

    Args:
        request_body: SOAP request XML

    Returns:
        SOAP response with validation result
        - Empty string = version is supported
        - "W:<message>" = warning but continue
        - "E:<message>" = error, refuse connection
    """
    # For now, accept all versions
    # In production, you may want to validate minimum version
    body = """
        <clientVersionResponse xmlns="http://developer.intuit.com/">
            <clientVersionResult></clientVersionResult>
        </clientVersionResponse>
    """
    return Response(content=create_soap_response(body), media_type="text/xml")


async def handle_authenticate(request_body: str, db_pool: asyncpg.Pool) -> Response:
    """
    Handle authenticate SOAP request.

    Validates credentials and creates a session ticket.

    Args:
        request_body: SOAP request XML with username/password
        db_pool: Database connection pool

    Returns:
        SOAP response with session ticket or error
        - Session ticket (UUID) = authenticated successfully
        - "nvu" = invalid username/password
        - "" = busy, try again later
    """
    # Parse username and password from SOAP request
    # (In production, use proper XML parsing)
    import re

    username_match = re.search(r'<strUserName>(.*?)</strUserName>', request_body)
    password_match = re.search(r'<strPassword>(.*?)</strPassword>', request_body)

    if not username_match or not password_match:
        result = "nvu"  # Invalid credentials
    else:
        username = username_match.group(1)
        password = password_match.group(1)

        # Verify credentials
        is_valid = await verify_credentials(username, password, db_pool)

        if is_valid:
            # Fetch company file path
            async with db_pool.acquire() as conn:
                config = await conn.fetchrow(
                    """
                    SELECT company_file_path
                    FROM quickbooks_config
                    WHERE sync_enabled = true
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                )
                company_file = config['company_file_path'] if config else ""

            # Create session
            ticket = session_manager.create_session(username, company_file)
            result = f"{ticket}"
        else:
            result = "nvu"  # Invalid credentials

    body = f"""
        <authenticateResponse xmlns="http://developer.intuit.com/">
            <authenticateResult>
                <string>{result}</string>
                <string></string>
            </authenticateResult>
        </authenticateResponse>
    """
    return Response(content=create_soap_response(body), media_type="text/xml")


async def handle_send_request_xml(request_body: str, db_pool: asyncpg.Pool) -> Response:
    """
    Handle sendRequestXML SOAP request.

    Sends pending QBXML requests to QuickBooks.

    Args:
        request_body: SOAP request XML with ticket
        db_pool: Database connection pool

    Returns:
        SOAP response with QBXML request or empty string if no more requests
    """
    # Parse ticket from request
    import re
    ticket_match = re.search(r'<ticket>(.*?)</ticket>', request_body)

    if not ticket_match:
        qbxml_request = ""
    else:
        ticket = ticket_match.group(1)
        session = session_manager.get_session(ticket)

        if not session:
            qbxml_request = ""
        else:
            # Fetch pending requests if not already loaded
            if not session['pending_requests']:
                sync_service = QuickBooksSyncService(db_pool)
                pending_logs = await sync_service.get_pending_requests(limit=100)

                if pending_logs:
                    session['pending_requests'] = pending_logs
                    session['current_request_index'] = 0
                else:
                    qbxml_request = ""

            # Get next pending request
            if session['pending_requests']:
                index = session['current_request_index']

                if index < len(session['pending_requests']):
                    log = session['pending_requests'][index]
                    qbxml_request = log['qbxml_request']

                    # Mark as processing
                    async with db_pool.acquire() as conn:
                        await conn.execute(
                            """
                            UPDATE quickbooks_sync_log
                            SET status = $1, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2
                            """,
                            SyncStatus.PROCESSING.value,
                            log['id']
                        )

                    # Increment index for next call
                    session['current_request_index'] += 1
                else:
                    # No more requests
                    qbxml_request = ""
            else:
                qbxml_request = ""

    body = f"""
        <sendRequestXMLResponse xmlns="http://developer.intuit.com/">
            <sendRequestXMLResult>{qbxml_request}</sendRequestXMLResult>
        </sendRequestXMLResponse>
    """
    return Response(content=create_soap_response(body), media_type="text/xml")


async def handle_receive_response_xml(request_body: str, db_pool: asyncpg.Pool) -> Response:
    """
    Handle receiveResponseXML SOAP request.

    Receives and processes QBXML responses from QuickBooks.

    Args:
        request_body: SOAP request XML with ticket and response
        db_pool: Database connection pool

    Returns:
        SOAP response with percentage complete
    """
    # Parse ticket, response, and hresult
    import re

    ticket_match = re.search(r'<ticket>(.*?)</ticket>', request_body)
    response_match = re.search(r'<response>(.*?)</response>', request_body, re.DOTALL)
    hresult_match = re.search(r'<hresult>(.*?)</hresult>', request_body)

    if ticket_match and response_match:
        ticket = ticket_match.group(1)
        qbxml_response = response_match.group(1)
        hresult = hresult_match.group(1) if hresult_match else "0"

        session = session_manager.get_session(ticket)

        if session and session['pending_requests']:
            # Get the log ID of the request we just processed
            index = session['current_request_index'] - 1  # Last sent request

            if 0 <= index < len(session['pending_requests']):
                log = session['pending_requests'][index]
                log_id = str(log['id'])

                # Process the response
                sync_service = QuickBooksSyncService(db_pool)
                success = (hresult == "0")  # hresult 0 = success

                await sync_service.process_qb_response(
                    log_id=log_id,
                    qbxml_response=qbxml_response,
                    success=success
                )

    # Calculate percentage complete
    # (not critical for basic operation, can return 100)
    percentage = 100

    body = f"""
        <receiveResponseXMLResponse xmlns="http://developer.intuit.com/">
            <receiveResponseXMLResult>{percentage}</receiveResponseXMLResult>
        </receiveResponseXMLResponse>
    """
    return Response(content=create_soap_response(body), media_type="text/xml")


async def handle_close_connection(request_body: str) -> Response:
    """
    Handle closeConnection SOAP request.

    Closes the Web Connector session.

    Args:
        request_body: SOAP request XML with ticket

    Returns:
        SOAP response with close message
    """
    # Parse ticket
    import re
    ticket_match = re.search(r'<ticket>(.*?)</ticket>', request_body)

    if ticket_match:
        ticket = ticket_match.group(1)
        session_manager.close_session(ticket)

    message = "Sync session closed successfully"

    body = f"""
        <closeConnectionResponse xmlns="http://developer.intuit.com/">
            <closeConnectionResult>{message}</closeConnectionResult>
        </closeConnectionResponse>
    """
    return Response(content=create_soap_response(body), media_type="text/xml")


async def handle_connection_error(request_body: str, db_pool: asyncpg.Pool) -> Response:
    """
    Handle connectionError SOAP request.

    Logs connection errors from Web Connector.

    Args:
        request_body: SOAP request XML with ticket and error details
        db_pool: Database connection pool

    Returns:
        SOAP response with "done" status
    """
    # Parse error details
    import re

    ticket_match = re.search(r'<ticket>(.*?)</ticket>', request_body)
    hresult_match = re.search(r'<hresult>(.*?)</hresult>', request_body)
    message_match = re.search(r'<message>(.*?)</message>', request_body)

    if ticket_match:
        ticket = ticket_match.group(1)
        hresult = hresult_match.group(1) if hresult_match else "Unknown"
        error_message = message_match.group(1) if message_match else "Unknown error"

        # Log error (could store in database)
        print(f"QB Connection Error - Ticket: {ticket}, HRESULT: {hresult}, Message: {error_message}")

        # Close session
        session_manager.close_session(ticket)

    body = """
        <connectionErrorResponse xmlns="http://developer.intuit.com/">
            <connectionErrorResult>done</connectionErrorResult>
        </connectionErrorResponse>
    """
    return Response(content=create_soap_response(body), media_type="text/xml")


async def handle_get_last_error(request_body: str) -> Response:
    """
    Handle getLastError SOAP request.

    Returns the last error that occurred.

    Args:
        request_body: SOAP request XML with ticket

    Returns:
        SOAP response with error message
    """
    # For now, return no error
    # In production, you might track errors per session
    error_message = ""

    body = f"""
        <getLastErrorResponse xmlns="http://developer.intuit.com/">
            <getLastErrorResult>{error_message}</getLastErrorResult>
        </getLastErrorResponse>
    """
    return Response(content=create_soap_response(body), media_type="text/xml")


# ==================== Health Check Endpoint ====================

@router.get("/health")
async def health_check():
    """
    Health check endpoint for QuickBooks Web Connector.

    Returns:
        Status message
    """
    return {
        "status": "healthy",
        "service": "QuickBooks Web Connector",
        "active_sessions": len(session_manager.sessions)
    }
