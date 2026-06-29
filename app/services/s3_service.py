import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.config import settings


def _get_client():
    """Create and return a boto3 S3 client."""
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


def upload_file(file_bytes: bytes, s3_key: str, content_type: str = "text/csv") -> str:
    """
    Upload a file to S3.
    Returns the S3 key on success.
    """
    client = _get_client()
    try:
        client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return s3_key
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"S3 upload failed: {e.response['Error']['Message']}",
        )


def download_file(s3_key: str) -> bytes:
    """
    Download a file from S3 and return its raw bytes.
    """
    client = _get_client()
    try:
        response = client.get_object(
            Bucket=settings.s3_bucket_name, Key=s3_key)
        return response["Body"].read()
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "NoSuchKey":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="File not found in S3")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"S3 download failed: {e.response['Error']['Message']}",
        )


def delete_file(s3_key: str) -> None:
    """Delete a file from S3."""
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.s3_bucket_name, Key=s3_key)
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"S3 delete failed: {e.response['Error']['Message']}",
        )


def check_s3_accessible() -> bool:
    """Health check: verify that the S3 bucket is accessible."""
    client = _get_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket_name)
        return True
    except ClientError:
        return False
