import os
import json
import time
import uuid
import boto3
from botocore.exceptions import ClientError

DDB_TABLE = os.environ["DDB_TABLE"]
SES_SENDER = os.environ["SES_SENDER"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]

dynamodb = boto3.resource("dynamodb")
ses = boto3.client("ses", region_name="ap-south-1")


table = dynamodb.Table(DDB_TABLE)

def lambda_handler(event, context):
    
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
    }
    
    body = json.loads(event.get("body") or "{}")

    required = ["city", "area", "description", "wasteType", "urgency", "photoKey"]
    for f in required:
        if not body.get(f):
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": f"Missing field: {f}"})
            }

    report_id = str(uuid.uuid4())
    timestamp = int(time.time())

    item = {
        "reportId": report_id,
        "timestamp": timestamp,
        "status": "Pending",
        **body
    }

    table.put_item(Item=item)

    # Email to admin
    subject = f"New Waste Report #{report_id}"
    msg = f"""
A new waste report has been submitted.

City: {body['city']}
Area: {body['area']}
Type: {body['wasteType']}
Urgency: {body['urgency']}
Description: {body['description']}
Photo: {body['photoKey']}
Report ID: {report_id}
"""

    ses.send_email(
        Source=SES_SENDER,
        Destination={"ToAddresses": [ADMIN_EMAIL]},
        Message={
            "Subject": {"Data": subject},
            "Body": {
                "Text": {"Data": msg}
            }
        }
    )

    # Email to user
    if body.get("contactEmail"):
        ses.send_email(
            Source=SES_SENDER,
            Destination={"ToAddresses":[body["contactEmail"]]},
            Message={
                "Subject": {"Data": f"Report Received ({report_id})"},
                "Body": {
                    "Text": {"Data": "Thank you for submitting a waste report. Authorities will act soon."}
                }
            }
        )

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"reportId": report_id})
    }
