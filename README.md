# 🚮 Click & Clean – Serverless Waste Reporting System (AWS Full Deployment Guide)

A fully deployed, cloud-ready waste reporting application built on AWS.  
This project demonstrates a **real-world serverless architecture** using AWS Lambda, S3, DynamoDB, API Gateway, and SES.

This setup includes:
- **Frontend** → S3 Static Website Hosting  
- **Upload Service** → Pre-signed URLs (Lambda + S3)  
- **Report Service** → Save reports + send emails (Lambda + DynamoDB + SES)  
- **Email Notifications** → AWS SES  
- **Complete beginner-friendly deployment steps** with image placeholders

---

# 🌟 1. Architecture Overview  

Frontend (HTML/CSS/JS) → S3 Static Website Hosting
↓
API Gateway (REST API)
↓
┌─────────────────────────────┐
│ Lambda 1: GenerateUploadUrl │ → S3 (uploads)
└─────────────────────────────┘
↓
┌──────────────────────────────┐
│ Lambda 2: CreateReport │ → DynamoDB (WasteReports)
└──────────────────────────────┘
↓
AWS SES (Emails)

**📸 ARCHITECTURE IMAGE (replace this URL)**  
<img width="1536" height="1024" src="YOUR_ARCHITECTURE_IMAGE_URL_HERE" />

---

# 🗂 2. Project Structure  

click-clean/
│
├── frontend/
│ ├── index.html
│ ├── styles.css
│ ├── app.js
│
├── backend/
│ ├── generateUploadUrl.py
│ ├── createReport.py
│
└── README.md

---

# 🧠 3. Prerequisites  
- AWS Account  
- IAM Admin Access  
- Services used: S3, Lambda, API Gateway, DynamoDB, SES  
- Region: **ap-south-1 (Mumbai)**  
- VS Code (optional)

---

# ⭐ STEP 1 — DynamoDB Setup (WasteReports Table)

Go to AWS → DynamoDB → Create Table

Table name: WasteReports
Partition key: reportId (String)


**📸 TABLE IMAGE**  
<img width="1920" height="1080" src="YOUR_DDB_TABLE_IMAGE_URL" />

---

# ⭐ STEP 2 — S3 Bucket for File Uploads (Private)

Create bucket:
click-and-clean-uploads

Leave **Block Public Access = ON** (uploads must be private).

Add CORS (Permissions → CORS Configuration):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET","PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
📸 CORS IMAGE
<img src="YOUR_CORS_IMAGE_URL" />

⭐ STEP 3 — Lambda Function 1 (GenerateUploadUrl)
Function name: GenerateUploadUrl
Environment variable:

UPLOAD_BUCKET = click-and-clean-uploads

import json
import boto3
import os

S3_BUCKET = os.environ["UPLOAD_BUCKET"]
s3 = boto3.client("s3")

def lambda_handler(event, context):
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
    }

    body = json.loads(event.get("body") or "{}")
    file_name = body.get("fileName")
    content_type = body.get("contentType")

    if not file_name or not content_type:
        return {"statusCode":400,"headers":cors,
                "body":json.dumps({"error":"Missing fileName or contentType"})}

    file_key = f"reports/{file_name}"

    url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": S3_BUCKET, "Key": file_key, "ContentType": content_type},
        ExpiresIn=3600
    )

    return {"statusCode":200,"headers":cors,
            "body":json.dumps({"uploadUrl":url,"fileKey":file_key})}
📸 LAMBDA IMAGE
<img src="YOUR_LAMBDA1_IMAGE_URL" />

⭐ STEP 4 — Lambda Function 2 (CreateReport)
Function name:

nginx
Copy code
CreateReport
Environment variables:

ini
Copy code
DDB_TABLE = WasteReports
SES_SENDER = clickcleanhelp@gmail.com
ADMIN_EMAIL = clickcleanhelp@gmail.com
Paste this code:

python
Copy code
import os, json, time, uuid, boto3

DDB_TABLE = os.environ["DDB_TABLE"]
SES_SENDER = os.environ["SES_SENDER"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]

dynamodb = boto3.resource("dynamodb")
ses = boto3.client("ses", region_name="ap-south-1")

table = dynamodb.Table(DDB_TABLE)

def lambda_handler(event, context):

    cors = {
        "Access-Control-Allow-Origin":"*",
        "Access-Control-Allow-Headers":"*",
        "Access-Control-Allow-Methods":"*"
    }

    body = json.loads(event.get("body") or "{}")
    required = ["city","area","description","wasteType","urgency","photoKey"]

    for f in required:
        if not body.get(f):
            return {"statusCode":400,"headers":cors,
                "body":json.dumps({"error":f"Missing field: {f}"})}

    report_id = str(uuid.uuid4())
    timestamp = int(time.time())

    item = {
        "reportId": report_id,
        "timestamp": timestamp,
        "status": "Pending",
        **body
    }

    table.put_item(Item=item)

    ses.send_email(
        Source=SES_SENDER,
        Destination={"ToAddresses":[ADMIN_EMAIL]},
        Message={
            "Subject":{"Data":f"New Waste Report #{report_id}"},
            "Body":{"Text":{"Data":json.dumps(body, indent=2)}}
        }
    )

    if body.get("contactEmail"):
        ses.send_email(
            Source=SES_SENDER,
            Destination={"ToAddresses":[body["contactEmail"]]},
            Message={
                "Subject":{"Data":f"Report Received ({report_id})"},
                "Body":{"Text":{"Data":"Thank you! Authorities will act soon."}}
            }
        )

    return {
        "statusCode":200,
        "headers":cors,
        "body":json.dumps({"reportId":report_id})
    }
📸 LAMBDA IMAGE
<img src="YOUR_LAMBDA2_IMAGE_URL" />

⭐ STEP 5 — API Gateway Setup
Create REST API:

nginx
Copy code
ClickCleanAPI
Create resource /upload-url

POST → GenerateUploadUrl

Enable CORS

Create resource /reports

POST → CreateReport

Enable CORS

Deploy API → Stage:

r
Copy code
prod
Invoke URL example:

bash
Copy code
https://kvt0yw8wg6.execute-api.ap-south-1.amazonaws.com/prod
📸 API IMAGE
<img src="YOUR_API_IMAGE_URL" />

⭐ STEP 6 — SES Setup (Email)
Verify the email you will send FROM:

css
Copy code
clickcleanhelp@gmail.com
While SES is in sandbox → verify recipient too.

Emails may go to SPAM.

📸 SES IMAGE
<img src="YOUR_SES_IMAGE_URL" />

⭐ STEP 7 — Frontend Setup (S3 Static Website)
Create bucket:

arduino
Copy code
click-clean-frontend
Disable Block Public Access.

Enable Static Website Hosting.

Add policy:

json
Copy code
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect":"Allow",
    "Principal":"*",
    "Action":"s3:GetObject",
    "Resource":"arn:aws:s3:::click-clean-frontend/*"
  }]
}
Upload:

index.html

styles.css

app.js

Inside app.js:

js
Copy code
const API_BASE_URL = "https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod";
📸 FRONTEND IMAGE
<img src="YOUR_FRONTEND_IMAGE_URL" />

⭐ STEP 8 — Final Testing
Open your S3 website URL.

Steps:

1️⃣ Select city, area, waste type
2️⃣ Upload an image
3️⃣ Click "Submit Report"

Expected results:

✔ Image uploaded to S3
✔ Report saved in DynamoDB
✔ Email to admin
✔ Email to user
✔ “Report Submitted Successfully” message

📸 FINAL FORM IMAGE
<img src="YOUR_FINAL_FORM_IMAGE_URL" />

🎉 Project Successfully Completed
The Click & Clean system is now fully deployed:

✔ S3 Frontend
✔ S3 Upload Bucket
✔ Lambda Functions
✔ API Gateway
✔ DynamoDB
✔ SES Email Notifications
✔ Complete Serverless Architecture

👨‍💻 Author
Vinit Tippanawar
AWS | Cloud | DevOps

⭐ If this project helped you, please star the repo!
