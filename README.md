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
