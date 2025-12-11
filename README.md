# 🚀 Click & Clean — Serverless Waste Reporting System (AWS S3 + Lambda + API Gateway + DynamoDB + SES)

A fully deployed **serverless waste-reporting application** built on AWS.  
Users upload a photo, fill details, submit a report, and an email notification is sent automatically.

This project uses:

- **S3** → Frontend hosting + Waste photo uploads  
- **API Gateway** → Public API endpoints  
- **Lambda** → Backend logic (upload URL + create report)  
- **DynamoDB** → Store reports  
- **SES** → Send email notifications  
- **IAM** → Permissions & access control  

---

# 🌟 1. Architecture Overview
```
Frontend (S3 Static Website)
↓
API Gateway (POST /upload-url, POST /reports)
↓
Lambda Functions
• GenerateUploadUrl
• CreateReport
↓
S3 Bucket (Waste Photos)
↓
DynamoDB (WasteReports table)
↓
SES (Admin + User Emails)
```

# ⭐ Step 1 — Create S3 Buckets (Frontend + File Uploads)

You need **two S3 buckets** for this project:

---

## 🟢 1) S3 Bucket for Frontend Hosting  
This bucket will store your HTML, CSS, JS files.

**Bucket name : click-clean-frontend** 

Enable:
- **Static website hosting**
- **Public read access**

## 🟢 2) S3 Bucket for Photo Uploads

This bucket stores uploaded waste images using pre-signed URLs.

**Bucket name :click-and-clean-uploads**

 Keep Block Public Access = ON
(Users upload using pre-signed URLs, no need for public access.)

📝 Add CORS to Uploads Bucket

**Go to bucket → Permissions → CORS → Paste:**
```
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```
**📸 CORS Settings Screenshot**


# ⭐ Step 2 — Create DynamoDB Table (WasteReports)

Your application needs one DynamoDB table to store all submitted waste reports.

Follow these steps:

# 1️⃣ Create DynamoDB Table
- Go to **AWS Console → DynamoDB → Create Table**
- Use the following settings:
  
Table name: WasteReports

Partition key: reportId (String)

# 2️⃣ Table Structure

Each report stored will automatically contain:

reportId (UUID)

city

area

description

wasteType

urgency

photoKey (S3 path)

timestamp

status (Default: "Pending")

**EXAMPLE ITEM**
```
{
  "reportId": "1234-5678-9999",
  "city": "Pune",
  "area": "Shivajinagar",
  "description": "Garbage collected near footpath",
  "wasteType": "Garbage",
  "urgency": "Medium",
  "photoKey": "reports/garbage.jpg",
  "timestamp": 1733840000,
  "status": "Pending"
}
```
# 3️⃣ No Indexes Needed

This project only requires the primary key.

No secondary indexes or sort keys are needed for basic reporting.


# 4️⃣ Verify Table is Created

Go to: 
```
DynamoDB → Tables → WasteReports → Explore Table Items
```
You will see entries appear after each successful report submission

# ⭐ Step 3 — Create Lambda Function: GenerateUploadUrl (S3 Pre-Signed Uploads)

  This Lambda function generates a secure pre-signed URL so the user can upload photos directly to S3 without exposing your AWS keys.

 # 🟢 1️⃣ Create Lambda Function

 Go to:
```
 AWS → Lambda → Create function
```
Choose:
```
Function name: GenerateUploadUrl
Runtime: Python 3.11
Architecture: x86_64
Permissions: Create new role with basic Lambda permissions
```
# 🟢 2️⃣ Add Environment Variable

Go to:
```
Configuration → Environment variables → Edit
```
Add:

| Key           | Value                   |
| ------------- | ----------------------- |
| UPLOAD_BUCKET | click-and-clean-uploads |

Save.

# 🟢 3️⃣ Paste Lambda Code

Replace existing code with:
```
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

    if not file_name or not content_type:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*"},
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
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"uploadUrl": upload_url, "fileKey": file_key})
        }

    except ClientError as e:
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)})
        }
```

Click Deploy.

# 🟢 4️⃣ Add S3 Permissions to Lambda Role

Go to:
 ```
   Configuration → Permissions → Role name 
 ```
Then: 
```
 Add permissions → Attach policies
```
Attach:
```
AmazonS3FullAccess
```
# ⭐ Step 4 — Create Lambda Function: CreateReport (Store Report + Send Email)

This Lambda function saves the user's waste report to DynamoDB and sends email notifications using Amazon SES.

---

## 🟢 1️⃣ Create Lambda Function
Go to:
AWS Console → Lambda → Create Function

Use:

Function name: CreateReport  
Runtime: Python 3.11  
Architecture: x86_64  
Permissions: Create new role with basic Lambda permissions  

---

## 🟢 2️⃣ Add Environment Variables
Go to:
```
Configuration → Environment variables → Edit
``` 
Add these three:

| Key          | Value                       |
|--------------|-----------------------------|
| DDB_TABLE    | WasteReports                |
| SES_SENDER   | clickcleanhelp@gmail.com    |
| ADMIN_EMAIL  | clickcleanhelp@gmail.com    |

Save.

---

## 🟢 3️⃣ Paste Lambda Code

```python
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
ses = boto3.client("ses")

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
            "Body": {"Text": {"Data": msg}}
        }
    )

    if body.get("contactEmail"):
        ses.send_email(
            Source=SES_SENDER,
            Destination={"ToAddresses":[body["contactEmail"]]},
            Message={
                "Subject": {"Data": f"Report Received ({report_id})"},
                "Body": {"Text": {"Data": "Thank you for submitting a waste report. Authorities will act soon."}}
            }
        )

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"reportId": report_id})
    }
```
Click **Deploy**.

# 🟢 4️⃣ Add Permissions to Lambda Role

Go to:
```
Configuration → Permissions → Role name
```

Attach these policies:

 **AmazonDynamoDBFullAccess**

 **AmazonSESFullAccess**

Your CreateReport Lambda is now ready. 

# ⭐ Step 5 — Configure API Gateway (POST /upload-url & POST /reports)

API Gateway connects your frontend to your Lambda functions.  
Here you will create two endpoints:

1️⃣ **POST /upload-url** → calls GenerateUploadUrl  
2️⃣ **POST /reports** → calls CreateReport  

---

## 🟢 1️⃣ Create a New REST API
Go to:
AWS Console → API Gateway → Create API → REST API → Build

Settings:
API name: ClickCleanAPI  
Endpoint type: Regional  

Click **Create API**.

---

## 🟢 2️⃣ Create Resource: /upload-url
Go to:
Actions → Create Resource

Resource name: upload-url  
Resource path: /upload-url  

Enable CORS: **YES**

Click **Create Resource**.

---

## 🟢 3️⃣ Add POST Method to /upload-url
Select **/upload-url** → Actions → Create Method → POST

Choose:
Integration type: Lambda  
Lambda Function: GenerateUploadUrl  
Lambda proxy integration: **ON**

Save → Allow.

---

## 🟢 4️⃣ Enable CORS for /upload-url (Important)
Select /upload-url → Actions → Enable CORS  

Settings:
- Allowed Methods: OPTIONS, POST  
- Allowed Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token  
- Allowed Origin: *  

Click **Save**.

---

## 🟢 5️⃣ Create Resource: /reports
Go to:
Actions → Create Resource

Resource name: reports  
Resource path: /reports  

Enable CORS: **YES**

Click **Create Resource**.

---

## 🟢 6️⃣ Add POST Method to /reports
Select **/reports** → Actions → Create Method → POST

Integration type: Lambda  
Lambda Function: CreateReport  
Lambda proxy integration: **ON**

Save → Allow.

---


## 🟢 Deploy the API
Go to:
Actions → Deploy API

Choose:
Stage name: **prod**  

Click **Deploy**.

You will now get your backend endpoint:

Use this URL in your frontend(edit in app.js code):

```
const API_BASE_URL = "https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod";
```
