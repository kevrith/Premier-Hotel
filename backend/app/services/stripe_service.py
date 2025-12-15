"""
Stripe Payment Service
Handles Stripe payment processing
"""

import stripe
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)


class StripeService:
    """Stripe payment service"""

    def __init__(self):
        self.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
        if self.api_key:
            stripe.api_key = self.api_key

    def create_payment_intent(
        self,
        amount: float,
        currency: str = "kes",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe Payment Intent

        Args:
            amount: Amount in smallest currency unit (cents for USD, cents for KES)
            currency: Currency code (default: kes)
            metadata: Additional metadata

        Returns:
            Payment Intent object
        """
        try:
            # Convert to smallest unit (e.g., cents)
            amount_cents = int(amount * 100)

            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency.lower(),
                metadata=metadata or {},
                automatic_payment_methods={
                    'enabled': True,
                },
            )

            logger.info(f"Stripe Payment Intent created: {payment_intent.id}")

            return {
                "id": payment_intent.id,
                "client_secret": payment_intent.client_secret,
                "amount": payment_intent.amount,
                "currency": payment_intent.currency,
                "status": payment_intent.status
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            raise Exception(f"Stripe payment error: {str(e)}")

    def retrieve_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Retrieve a Payment Intent by ID"""
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

            return {
                "id": payment_intent.id,
                "amount": payment_intent.amount / 100,  # Convert back to main units
                "currency": payment_intent.currency,
                "status": payment_intent.status,
                "metadata": payment_intent.metadata
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving payment intent: {str(e)}")
            raise Exception(f"Failed to retrieve payment: {str(e)}")

    def confirm_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Confirm a Payment Intent (for manual confirmation flow)"""
        try:
            payment_intent = stripe.PaymentIntent.confirm(payment_intent_id)

            return {
                "id": payment_intent.id,
                "status": payment_intent.status,
                "amount": payment_intent.amount / 100,
                "currency": payment_intent.currency
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {str(e)}")
            raise Exception(f"Failed to confirm payment: {str(e)}")

    def cancel_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Cancel a Payment Intent"""
        try:
            payment_intent = stripe.PaymentIntent.cancel(payment_intent_id)

            return {
                "id": payment_intent.id,
                "status": payment_intent.status
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling payment: {str(e)}")
            raise Exception(f"Failed to cancel payment: {str(e)}")

    def create_refund(
        self,
        payment_intent_id: str,
        amount: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Create a refund for a payment

        Args:
            payment_intent_id: Payment Intent ID
            amount: Amount to refund (None for full refund)
        """
        try:
            refund_data = {"payment_intent": payment_intent_id}

            if amount:
                refund_data["amount"] = int(amount * 100)

            refund = stripe.Refund.create(**refund_data)

            return {
                "id": refund.id,
                "amount": refund.amount / 100,
                "currency": refund.currency,
                "status": refund.status
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating refund: {str(e)}")
            raise Exception(f"Failed to create refund: {str(e)}")

    def construct_webhook_event(self, payload: bytes, sig_header: str) -> Any:
        """
        Construct and verify a Stripe webhook event

        Args:
            payload: Raw request body
            sig_header: Stripe-Signature header value

        Returns:
            Stripe Event object
        """
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)

        if not webhook_secret:
            raise Exception("Stripe webhook secret not configured")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            return event

        except ValueError:
            raise Exception("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise Exception("Invalid signature")

    def list_payment_methods(self, customer_id: str) -> list:
        """List payment methods for a customer"""
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type="card"
            )

            return [{
                "id": pm.id,
                "type": pm.type,
                "card": {
                    "brand": pm.card.brand,
                    "last4": pm.card.last4,
                    "exp_month": pm.card.exp_month,
                    "exp_year": pm.card.exp_year
                }
            } for pm in payment_methods.data]

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error listing payment methods: {str(e)}")
            raise Exception(f"Failed to list payment methods: {str(e)}")

    def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {}
            )

            return {
                "id": customer.id,
                "email": customer.email,
                "name": customer.name
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise Exception(f"Failed to create customer: {str(e)}")


# Singleton instance
stripe_service = StripeService()
