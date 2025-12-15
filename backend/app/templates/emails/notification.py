"""Generic Notification Email Template"""

def get_template() -> str:
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                🏨 Premier Hotel
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">
                                You have a new notification
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 22px;">
                                {{ title }}
                            </h2>

                            <div style="color: #666666; font-size: 14px; line-height: 1.8; margin-bottom: 30px;">
                                {{ message }}
                            </div>

                            {% if event_type %}
                            <!-- Event Badge -->
                            <div style="margin-bottom: 30px;">
                                {% if event_type == 'booking_confirmed' %}
                                <span style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    BOOKING
                                </span>
                                {% elif event_type == 'payment_completed' %}
                                <span style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    PAYMENT
                                </span>
                                {% elif event_type == 'order_ready' %}
                                <span style="display: inline-block; background-color: #f59e0b; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    ORDER
                                </span>
                                {% elif event_type == 'loyalty_reward' %}
                                <span style="display: inline-block; background-color: #8b5cf6; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    LOYALTY
                                </span>
                                {% else %}
                                <span style="display: inline-block; background-color: #6b7280; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    NOTIFICATION
                                </span>
                                {% endif %}
                            </div>
                            {% endif %}

                            <!-- CTA Button -->
                            {% if action_url %}
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ action_url }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            {{ action_text|default('View Details') }}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            {% endif %}

                            <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                If you have any questions, please contact us at <a href="mailto:premierhotel2023@gmail.com" style="color: #667eea; text-decoration: none;">premierhotel2023@gmail.com</a>.
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
