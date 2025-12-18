"""
QuickBooks POS 2013 Adapter Service

This service handles QBXML generation and parsing for QuickBooks POS 2013 integration.
It converts Premier Hotel data structures to QBXML format and vice versa.

QBXML Reference: QuickBooks POS SDK 13.0

Author: Premier Hotel Development Team
Date: 2025-12-18
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
from typing import List, Dict, Any, Optional
from datetime import datetime
from decimal import Decimal

from app.models.quickbooks import (
    QBXMLSalesReceipt,
    QBXMLLineItem,
    QBXMLInventoryAdjustment,
    QBXMLInventoryQuery,
    QBXMLCustomer,
    format_qb_date,
    map_payment_method_to_qb
)


class QuickBooksAdapter:
    """
    Adapter for converting between Premier Hotel data and QBXML format.

    This class provides methods to:
    - Generate QBXML requests from hotel data
    - Parse QBXML responses from QuickBooks
    - Handle data type conversions
    """

    # QBXML Version for QuickBooks POS 2013
    QBXML_VERSION = "13.0"
    QBPOS_VERSION = "13.0"

    def __init__(self):
        """Initialize the QuickBooks adapter"""
        pass

    # ========================================================================
    # QBXML Request Builders
    # ========================================================================

    def create_sales_receipt_request(
        self,
        sales_receipt: QBXMLSalesReceipt,
        request_id: str = "1"
    ) -> str:
        """
        Create QBXML request to add a sales receipt.

        Args:
            sales_receipt: Sales receipt data
            request_id: Unique request ID

        Returns:
            QBXML request string

        Example:
            >>> adapter = QuickBooksAdapter()
            >>> receipt = QBXMLSalesReceipt(...)
            >>> xml = adapter.create_sales_receipt_request(receipt)
        """
        # Create root QBXML element
        qbxml = ET.Element("QBXML")
        qbxml_msgs_rq = ET.SubElement(qbxml, "QBXMLMsgsRq", onError="stopOnError")

        # Sales receipt add request
        receipt_add_rq = ET.SubElement(
            qbxml_msgs_rq,
            "SalesReceiptAddRq",
            requestID=request_id
        )

        sales_receipt_add = ET.SubElement(receipt_add_rq, "SalesReceiptAdd")

        # Customer reference
        customer_ref = ET.SubElement(sales_receipt_add, "CustomerRef")
        if sales_receipt.customer_ref_list_id:
            ET.SubElement(customer_ref, "ListID").text = sales_receipt.customer_ref_list_id
        else:
            ET.SubElement(customer_ref, "FullName").text = sales_receipt.customer_ref_full_name or "Walk-in Customer"

        # Transaction date
        ET.SubElement(sales_receipt_add, "TxnDate").text = sales_receipt.txn_date

        # Reference number
        ET.SubElement(sales_receipt_add, "RefNumber").text = sales_receipt.ref_number

        # Payment method
        payment_method_ref = ET.SubElement(sales_receipt_add, "PaymentMethodRef")
        ET.SubElement(payment_method_ref, "FullName").text = sales_receipt.payment_method_ref_name

        # Memo
        if sales_receipt.memo:
            ET.SubElement(sales_receipt_add, "Memo").text = sales_receipt.memo

        # Line items
        for line_item in sales_receipt.sales_receipt_line_items:
            line_add = ET.SubElement(sales_receipt_add, "SalesReceiptLineAdd")

            # Item reference
            item_ref = ET.SubElement(line_add, "ItemRef")
            ET.SubElement(item_ref, "ListID").text = line_item.item_ref_list_id

            # Description
            if line_item.description:
                ET.SubElement(line_add, "Desc").text = line_item.description

            # Quantity and rate
            ET.SubElement(line_add, "Quantity").text = str(line_item.quantity)
            ET.SubElement(line_add, "Rate").text = f"{line_item.rate:.2f}"

            # Amount
            ET.SubElement(line_add, "Amount").text = f"{line_item.amount:.2f}"

            # Sales tax code
            if line_item.sales_tax_code_ref:
                tax_code_ref = ET.SubElement(line_add, "SalesTaxCodeRef")
                ET.SubElement(tax_code_ref, "FullName").text = line_item.sales_tax_code_ref

        return self._format_qbxml(qbxml)

    def create_inventory_query_request(
        self,
        query: QBXMLInventoryQuery,
        request_id: str = "1"
    ) -> str:
        """
        Create QBXML request to query inventory levels.

        Args:
            query: Inventory query parameters
            request_id: Unique request ID

        Returns:
            QBXML request string
        """
        qbxml = ET.Element("QBXML")
        qbxml_msgs_rq = ET.SubElement(qbxml, "QBXMLMsgsRq", onError="stopOnError")

        item_query_rq = ET.SubElement(
            qbxml_msgs_rq,
            "ItemInventoryQueryRq",
            requestID=request_id
        )

        # Max returned
        ET.SubElement(item_query_rq, "MaxReturned").text = str(query.max_returned)

        # Active status
        ET.SubElement(item_query_rq, "ActiveStatus").text = query.active_status

        # Specific item filter
        if query.item_ref_list_id or query.item_ref_full_name:
            list_id_filter = ET.SubElement(item_query_rq, "ListID")
            if query.item_ref_list_id:
                list_id_filter.text = query.item_ref_list_id

        # Include line items
        ET.SubElement(item_query_rq, "IncludeRetElement").text = "QuantityOnHand"
        ET.SubElement(item_query_rq, "IncludeRetElement").text = "AverageCost"

        return self._format_qbxml(qbxml)

    def create_inventory_adjustment_request(
        self,
        adjustment: QBXMLInventoryAdjustment,
        request_id: str = "1"
    ) -> str:
        """
        Create QBXML request to adjust inventory levels.

        Args:
            adjustment: Inventory adjustment data
            request_id: Unique request ID

        Returns:
            QBXML request string
        """
        qbxml = ET.Element("QBXML")
        qbxml_msgs_rq = ET.SubElement(qbxml, "QBXMLMsgsRq", onError="stopOnError")

        adj_add_rq = ET.SubElement(
            qbxml_msgs_rq,
            "InventoryAdjustmentAddRq",
            requestID=request_id
        )

        inv_adj_add = ET.SubElement(adj_add_rq, "InventoryAdjustmentAdd")

        # Account reference
        account_ref = ET.SubElement(inv_adj_add, "AccountRef")
        ET.SubElement(account_ref, "FullName").text = adjustment.account_ref_name

        # Transaction date
        ET.SubElement(inv_adj_add, "TxnDate").text = adjustment.txn_date

        # Reference number
        ET.SubElement(inv_adj_add, "RefNumber").text = adjustment.ref_number

        # Memo
        if adjustment.memo:
            ET.SubElement(inv_adj_add, "Memo").text = adjustment.memo

        # Line item
        line_add = ET.SubElement(inv_adj_add, "InventoryAdjustmentLineAdd")

        # Item reference
        item_ref = ET.SubElement(line_add, "ItemRef")
        ET.SubElement(item_ref, "ListID").text = adjustment.item_ref_list_id

        # Quantity adjustment
        qty_adj = ET.SubElement(line_add, "QuantityAdjustment")
        ET.SubElement(qty_adj, "NewQuantity").text = str(adjustment.new_quantity)

        # Value adjustment (if cost provided)
        if adjustment.unit_cost is not None:
            value_adj = ET.SubElement(line_add, "ValueAdjustment")
            ET.SubElement(value_adj, "NewValue").text = f"{adjustment.unit_cost * adjustment.new_quantity:.2f}"

        return self._format_qbxml(qbxml)

    def create_customer_add_request(
        self,
        customer: QBXMLCustomer,
        request_id: str = "1"
    ) -> str:
        """
        Create QBXML request to add a customer.

        Args:
            customer: Customer data
            request_id: Unique request ID

        Returns:
            QBXML request string
        """
        qbxml = ET.Element("QBXML")
        qbxml_msgs_rq = ET.SubElement(qbxml, "QBXMLMsgsRq", onError="stopOnError")

        customer_add_rq = ET.SubElement(
            qbxml_msgs_rq,
            "CustomerAddRq",
            requestID=request_id
        )

        customer_add = ET.SubElement(customer_add_rq, "CustomerAdd")

        # Customer name (required, must be unique)
        ET.SubElement(customer_add, "Name").text = customer.name

        # First and last name
        if customer.first_name:
            ET.SubElement(customer_add, "FirstName").text = customer.first_name
        if customer.last_name:
            ET.SubElement(customer_add, "LastName").text = customer.last_name

        # Contact information
        if customer.email:
            ET.SubElement(customer_add, "Email").text = customer.email
        if customer.phone:
            ET.SubElement(customer_add, "Phone").text = customer.phone

        # Billing address
        if any([customer.bill_address_line1, customer.bill_address_city]):
            bill_address = ET.SubElement(customer_add, "BillAddress")
            if customer.bill_address_line1:
                ET.SubElement(bill_address, "Addr1").text = customer.bill_address_line1
            if customer.bill_address_city:
                ET.SubElement(bill_address, "City").text = customer.bill_address_city
            if customer.bill_address_country:
                ET.SubElement(bill_address, "Country").text = customer.bill_address_country

        return self._format_qbxml(qbxml)

    # ========================================================================
    # QBXML Response Parsers
    # ========================================================================

    def parse_sales_receipt_response(self, qbxml_response: str) -> Dict[str, Any]:
        """
        Parse QBXML response from sales receipt add request.

        Args:
            qbxml_response: QBXML response string

        Returns:
            Dictionary with parsed data including:
            - txn_id: QuickBooks transaction ID
            - edit_sequence: Edit sequence number
            - status_code: Response status code
            - status_message: Response message
        """
        try:
            root = ET.fromstring(qbxml_response)

            # Find SalesReceiptAddRs
            receipt_rs = root.find(".//SalesReceiptAddRs")
            if receipt_rs is None:
                return {"success": False, "error": "No SalesReceiptAddRs in response"}

            # Check status
            status_code = receipt_rs.get("statusCode", "")
            status_message = receipt_rs.get("statusMessage", "")

            if status_code != "0":
                return {
                    "success": False,
                    "status_code": status_code,
                    "status_message": status_message
                }

            # Extract sales receipt data
            receipt = receipt_rs.find("SalesReceiptRet")
            if receipt is None:
                return {"success": False, "error": "No SalesReceiptRet in response"}

            txn_id = receipt.findtext("TxnID")
            edit_sequence = receipt.findtext("EditSequence")

            return {
                "success": True,
                "txn_id": txn_id,
                "edit_sequence": edit_sequence,
                "status_code": status_code,
                "status_message": status_message
            }

        except ET.ParseError as e:
            return {"success": False, "error": f"XML parse error: {str(e)}"}

    def parse_inventory_query_response(self, qbxml_response: str) -> Dict[str, Any]:
        """
        Parse QBXML response from inventory query request.

        Args:
            qbxml_response: QBXML response string

        Returns:
            Dictionary with inventory items and their quantities
        """
        try:
            root = ET.fromstring(qbxml_response)

            # Find ItemInventoryQueryRs
            query_rs = root.find(".//ItemInventoryQueryRs")
            if query_rs is None:
                return {"success": False, "error": "No ItemInventoryQueryRs in response"}

            # Check status
            status_code = query_rs.get("statusCode", "")
            if status_code != "0":
                return {
                    "success": False,
                    "status_code": status_code,
                    "status_message": query_rs.get("statusMessage", "")
                }

            # Parse inventory items
            items = []
            for item_ret in query_rs.findall("ItemInventoryRet"):
                item_data = {
                    "list_id": item_ret.findtext("ListID"),
                    "edit_sequence": item_ret.findtext("EditSequence"),
                    "name": item_ret.findtext("Name"),
                    "full_name": item_ret.findtext("FullName"),
                    "sku": item_ret.findtext("ManufacturerPartNumber"),
                    "quantity_on_hand": float(item_ret.findtext("QuantityOnHand", "0")),
                    "average_cost": float(item_ret.findtext("AverageCost", "0")),
                    "is_active": item_ret.findtext("IsActive") == "true"
                }
                items.append(item_data)

            return {
                "success": True,
                "items": items,
                "count": len(items)
            }

        except ET.ParseError as e:
            return {"success": False, "error": f"XML parse error: {str(e)}"}

    def parse_customer_add_response(self, qbxml_response: str) -> Dict[str, Any]:
        """
        Parse QBXML response from customer add request.

        Args:
            qbxml_response: QBXML response string

        Returns:
            Dictionary with customer ListID and edit sequence
        """
        try:
            root = ET.fromstring(qbxml_response)

            customer_rs = root.find(".//CustomerAddRs")
            if customer_rs is None:
                return {"success": False, "error": "No CustomerAddRs in response"}

            status_code = customer_rs.get("statusCode", "")
            if status_code != "0":
                return {
                    "success": False,
                    "status_code": status_code,
                    "status_message": customer_rs.get("statusMessage", "")
                }

            customer = customer_rs.find("CustomerRet")
            if customer is None:
                return {"success": False, "error": "No CustomerRet in response"}

            return {
                "success": True,
                "list_id": customer.findtext("ListID"),
                "edit_sequence": customer.findtext("EditSequence"),
                "full_name": customer.findtext("FullName")
            }

        except ET.ParseError as e:
            return {"success": False, "error": f"XML parse error: {str(e)}"}

    # ========================================================================
    # Utility Methods
    # ========================================================================

    def _format_qbxml(self, element: ET.Element) -> str:
        """
        Format XML element as pretty-printed QBXML string.

        Args:
            element: XML element tree

        Returns:
            Formatted QBXML string with XML declaration and processing instruction
        """
        # Add QBXML processing instruction
        xml_declaration = '<?xml version="1.0" encoding="utf-8"?>\n'
        qbxml_pi = f'<?qbxml version="{self.QBXML_VERSION}"?>\n'

        # Convert to string and pretty print
        rough_string = ET.tostring(element, encoding='unicode')
        reparsed = minidom.parseString(rough_string)
        pretty_xml = reparsed.toprettyxml(indent="  ")

        # Remove XML declaration from pretty print (we'll add our own)
        lines = pretty_xml.split('\n')
        if lines[0].startswith('<?xml'):
            lines = lines[1:]

        # Combine with custom declaration
        return xml_declaration + qbxml_pi + '\n'.join(lines).strip()

    def validate_qbxml(self, qbxml: str) -> bool:
        """
        Validate QBXML syntax.

        Args:
            qbxml: QBXML string to validate

        Returns:
            True if valid, False otherwise
        """
        try:
            ET.fromstring(qbxml)
            return True
        except ET.ParseError:
            return False

    def extract_error_details(self, qbxml_response: str) -> Optional[str]:
        """
        Extract detailed error information from QBXML response.

        Args:
            qbxml_response: QBXML response string

        Returns:
            Error message string or None if no error
        """
        try:
            root = ET.fromstring(qbxml_response)

            # Look for any response element with non-zero status
            for elem in root.iter():
                status_code = elem.get("statusCode")
                if status_code and status_code != "0":
                    status_message = elem.get("statusMessage", "Unknown error")
                    return f"Error {status_code}: {status_message}"

            return None

        except ET.ParseError:
            return "Failed to parse error response"
