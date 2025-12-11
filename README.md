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

# ⭐ Step 2 — Create S3 Buckets (Frontend + File Uploads)

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

Go to bucket → Permissions → CORS → Paste:
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





