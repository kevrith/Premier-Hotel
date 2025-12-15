"""Order Confirmation Email Template"""

def get_template() -> str:
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                🍽️ Order Confirmed
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">
                                Your order has been received
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
                                Thank you for your order! Our kitchen is preparing your food with care. We'll notify you when it's ready.
                            </p>

                            <!-- Order Details Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fffbeb; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #f59e0b;">
                                <tr>
                                    <td>
                                        <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px;">
                                            Order Details
                                        </h2>

                                        <table width="100%" cellpadding="8" cellspacing="0" border="0">
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    <strong>Order Number:</strong>
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    <strong>#{{ order_number }}</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Order Time:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ order_time }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Delivery Location:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ delivery_location }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Estimated Ready Time:
                                                </td>
                                                <td style="color: #f59e0b; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    <strong>{{ estimated_time }} minutes</strong>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Order Items -->
                            <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">Your Items:</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                                <tr>
                                    <td>
                                        {% for item in items %}
                                        <table width="100%" cellpadding="8" cellspacing="0" border="0" style="border-bottom: 1px solid #dee2e6; margin-bottom: 10px;">
                                            <tr>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0;">
                                                    {{ item.quantity }}x {{ item.name }}
                                                    {% if item.special_instructions %}
                                                    <br><span style="color: #666666; font-size: 12px; font-style: italic;">{{ item.special_instructions }}</span>
                                                    {% endif %}
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    KES {{ item.total_price }}
                                                </td>
                                            </tr>
                                        </table>
                                        {% endfor %}

                                        <table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top: 20px;">
                                            <tr>
                                                <td style="color: #333333; font-size: 16px; padding: 8px 0;">
                                                    <strong>Total Amount:</strong>
                                                </td>
                                                <td style="color: #f59e0b; font-size: 18px; padding: 8px 0; text-align: right;">
                                                    <strong>KES {{ total_amount }}</strong>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Status Info -->
                            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                                    <strong>Track Your Order:</strong> You can track the status of your order in real-time from your account dashboard.
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ hotel_website }}/my-orders" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            Track Your Order
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                If you have any questions about your order, please contact us at <a href="mailto:premierhotel2023@gmail.com" style="color: #f59e0b; text-decoration: none;">premierhotel2023@gmail.com</a>.
                            </p>

                            <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                Enjoy your meal!
                            </p>

                            <p style="margin: 20px 0 0 0; color: #333333; font-size: 14px;">
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
