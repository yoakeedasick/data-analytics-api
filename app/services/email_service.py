import boto3
from botocore.exceptions import ClientError
from app.config import settings


def send_otp_email(email: str, otp_code: str) -> None:
    """Send a verification 6-digit OTP email using AWS SES."""
    client_params = {}
    if settings.aws_access_key_id:
        client_params['aws_access_key_id'] = settings.aws_access_key_id
    if settings.aws_secret_access_key:
        client_params['aws_secret_access_key'] = settings.aws_secret_access_key

    client = boto3.client(
        'ses',
        region_name=settings.aws_region,
        **client_params
    )

    subject = "Dalytics - Verify your email address"
    body_html = f"""
    <html>
    <head></head>
    <body style="font-family: sans-serif; background-color: #FAF7F2; padding: 20px; color: #6A513E;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #E5DFD5;">
            <h2 style="color: #6A513E; margin-top: 0; font-family: Georgia, serif;">Welcome to Dalytics!</h2>
            <p style="font-size: 14px; color: #8A7E74;">Please use the following 6-digit verification code to complete your signup process:</p>
            <div style="background-color: #FAF7F2; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0; border: 1px solid #E5DFD5;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #6A513E;">{otp_code}</span>
            </div>
            <p style="font-size: 12px; color: #8A7E74; margin-bottom: 0;">This OTP code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
        </div>
    </body>
    </html>
    """

    try:
        client.send_email(
            Source=settings.sender_email,
            Destination={
                'ToAddresses': [email],
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Html': {
                        'Data': body_html,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
    except ClientError as e:
        print(f"Error sending email: {e.response['Error']['Message']}")
        print(f"\n--- [DEVELOPMENT ONLY] OTP Code for {email} is: {otp_code} ---\n")
        raise e


def send_reset_otp_email(email: str, otp_code: str) -> None:
    """Send a password reset 6-digit OTP email using AWS SES."""
    client_params = {}
    if settings.aws_access_key_id:
        client_params['aws_access_key_id'] = settings.aws_access_key_id
    if settings.aws_secret_access_key:
        client_params['aws_secret_access_key'] = settings.aws_secret_access_key

    client = boto3.client(
        'ses',
        region_name=settings.aws_region,
        **client_params
    )

    subject = "Dalytics - Reset your password"
    body_html = f"""
    <html>
    <head></head>
    <body style="font-family: sans-serif; background-color: #FAF7F2; padding: 20px; color: #6A513E;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #E5DFD5;">
            <h2 style="color: #6A513E; margin-top: 0; font-family: Georgia, serif;">Password Reset Request</h2>
            <p style="font-size: 14px; color: #8A7E74;">Please use the following 6-digit verification code to reset your password:</p>
            <div style="background-color: #FAF7F2; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0; border: 1px solid #E5DFD5;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #6A513E;">{otp_code}</span>
            </div>
            <p style="font-size: 12px; color: #8A7E74; margin-bottom: 0;">This OTP code is valid for 5 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
    </body>
    </html>
    """

    try:
        client.send_email(
            Source=settings.sender_email,
            Destination={
                'ToAddresses': [email],
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Html': {
                        'Data': body_html,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
    except ClientError as e:
        print(f"Error sending email: {e.response['Error']['Message']}")
        print(f"\n--- [DEVELOPMENT ONLY] OTP Code for {email} is: {otp_code} ---\n")
        raise e
