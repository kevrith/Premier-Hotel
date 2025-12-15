"""Payment Receipt Email Template"""

def get_template() -> str:
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                ✓ Payment Received
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">
                                Thank you for your payment
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">
                                Dear {{ customer_name }},
                            </p>

                            <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                Your payment has been successfully processed. Here's your receipt for your records.
                            </p>

                            <!-- Payment Details Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #10b981;">
                                <tr>
                                    <td>
                                        <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px;">
                                            Payment Receipt
                                        </h2>

                                        <table width="100%" cellpadding="8" cellspacing="0" border="0">
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    <strong>Payment ID:</strong>
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ payment_id }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Transaction ID:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ transaction_id }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Payment Method:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ payment_method }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Date:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ payment_date }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Reference:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ reference_type }} - {{ reference_number }}
                                                </td>
                                            </tr>
                                            <tr style="border-top: 2px solid #10b981;">
                                                <td style="color: #333333; font-size: 18px; padding: 12px 0;">
                                                    <strong>Amount Paid:</strong>
                                                </td>
                                                <td style="color: #10b981; font-size: 22px; padding: 12px 0; text-align: right;">
                                                    <strong>KES {{ amount }}</strong>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Success Message -->
                            <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                                <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                                    <strong>✓ Payment Successful</strong><br>
                                    Your payment has been confirmed and processed successfully. This receipt serves as proof of payment.
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ hotel_website }}/my-bookings" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            View Your Account
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                If you have any questions about this payment, please contact us at <a href="mailto:premierhotel2023@gmail.com" style="color: #10b981; text-decoration: none;">premierhotel2023@gmail.com</a>.
                            </p>

                            <p style="margin: 0; color: #333333; font-size: 14px;">
                                Best regards,<br>
                                <strong>The Premier Hotel Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px;">
                                © 2025 Premier Hotel. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 11px;">
                                This is an automated email. Please do not reply directly to this message.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
