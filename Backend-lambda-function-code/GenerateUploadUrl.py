import json
import boto3
import os
from botocore.exceptions import ClientError

S3_BUCKET = os.environ["UPLOAD_BUCKET"]

s3_client = boto3.client("s3")

def lambda_handler(event, context):
    body = json.loads(event.get("body") or "{}")

    file_name = body.get("fileName")
    content_type = body.get("contentType")

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
    }

    if not file_name or not content_type:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Missing fileName or contentType"})
        }

    file_key = f"reports/{file_name}"

    try:
        upload_url = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": file_key,
                "ContentType": content_type
            },
            ExpiresIn=3600
        )

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "uploadUrl": upload_url,
                "fileKey": file_key
            })
        }

    except ClientError as e:
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)})
        }
