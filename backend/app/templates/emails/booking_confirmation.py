"""Booking Confirmation Email Template"""

def get_template() -> str:
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
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
                                Booking Confirmation
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
                                Thank you for booking with Premier Hotel! Your reservation has been confirmed. We're excited to host you and ensure you have a wonderful stay.
                            </p>

                            <!-- Booking Details Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                                <tr>
                                    <td>
                                        <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px;">
                                            Booking Details
                                        </h2>

                                        <table width="100%" cellpadding="8" cellspacing="0" border="0">
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    <strong>Booking Number:</strong>
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    <strong>{{ booking_number }}</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Room Type:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ room_type }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Check-in:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ check_in_date }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Check-out:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ check_out_date }}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                                    Guests:
                                                </td>
                                                <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                                                    {{ num_guests }}
                                                </td>
                                            </tr>
                                            <tr style="border-top: 2px solid #dee2e6;">
                                                <td style="color: #333333; font-size: 16px; padding: 12px 0;">
                                                    <strong>Total Amount:</strong>
                                                </td>
                                                <td style="color: #667eea; font-size: 18px; padding: 12px 0; text-align: right;">
                                                    <strong>KES {{ total_amount }}</strong>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Important Information -->
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                                    <strong>Important:</strong> Please arrive after 2:00 PM for check-in. Check-out time is 11:00 AM. Early check-in or late check-out can be arranged for an additional fee.
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ hotel_website }}/my-bookings" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            View Your Booking
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                If you have any questions or need to modify your reservation, please don't hesitate to contact us at <a href="mailto:premierhotel2023@gmail.com" style="color: #667eea; text-decoration: none;">premierhotel2023@gmail.com</a> or call us at +254 XXX XXX XXX.
                            </p>

                            <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                We look forward to welcoming you!
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
