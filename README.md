# AI Sales CRM - Backend

Backend API for an **AI-powered Sales CRM automation system** built with Node.js, Express.js, MongoDB, n8n, Ollama, and Qwen3.

The backend manages leads and CRM data, while n8n handles AI-powered lead qualification, follow-ups, email automation, and sales notifications.

## Tech Stack

* Node.js
* Express.js
* MongoDB
* n8n
* Ollama
* Qwen3 8B
* Mailpit
* REST APIs
* Webhooks

---

## Prerequisites

Make sure the following are installed before running the project.

### 1. Install n8n

```bash
npm install -g n8n --ignore-scripts=false
```

Verify:

```bash
n8n --version
```

### 2. Install Ollama

```bash
brew install ollama
```

Start Ollama:

```bash
brew services start ollama
```

### 3. Install Qwen3 8B

Pull the AI model used by this project:

```bash
ollama pull qwen3:8b
```

Verify:

```bash
ollama list
```

You should see:

```text
qwen3:8b
```

### 4. Install Mailpit

Mailpit is used as a local SMTP server for testing email automation without sending real emails.

```bash
brew install mailpit
```

Start Mailpit:

```bash
brew services start mailpit
```

Open the Mailpit dashboard:

```text
http://localhost:8025
```

Default SMTP configuration:

```text
Host: localhost
Port: 1025
Security: None
Username: None
Password: None
```

---

## Project Setup

Clone the repository and navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your local configuration.

Example:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ai-sales-crm-n8n-db
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
SMTP_HOST=localhost
SMTP_PORT=1025
```

---

## Run the Backend

Development mode:

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3000
```

---

## AI Sales CRM Workflow

The backend works together with n8n and Ollama to automate the sales process.

```text
Angular CRM
     ↓
Node.js / Express API
     ↓
n8n Webhook
     ↓
Parse AI Request
     ↓
Qwen3 8B via Ollama
     ↓
Parse AI Response
     ↓
Update CRM
     ↓
Lead Qualification Router
     ↓
 ┌───────────────┴────────────────┐
 ↓                                ↓
Qualified                    Not Qualified
 ↓                                ↓
AI Follow-up Generator       Prepare Update
 ↓                                ↓
Save Follow-up               Update Lead DB
 ↓
Send AI Follow-up Email
 ↓
Sales Notification
 ↓
Send Sales Email
 ↓
Mailpit
```

## Workflow Overview

### 1. Webhook

Receives lead information from the Angular frontend or backend API.

### 2. Parse AI Request

Prepares the lead information for AI processing.

### 3. Qwen3 AI Generate

Qwen3 analyzes the lead and determines whether it is qualified.

### 4. Parse AI Response

Converts the AI response into structured data for further processing.

### 5. Update Documents

Stores the AI analysis and qualification information in the CRM.

### 6. Lead Qualification Router

Routes the lead based on the AI qualification result.

### Qualified Lead

* Generates a personalized AI follow-up
* Saves the follow-up
* Sends the follow-up email
* Notifies the sales team
* Sends sales notification email

### Not Qualified Lead

* Prepares the CRM update
* Updates the lead status in MongoDB

---

## Local Services

Before testing the complete workflow, make sure these services are running:

```bash
brew services list
```

You should have:

```text
ollama    started
mailpit   started
```

And MongoDB should also be running.

Check Ollama:

```bash
ollama list
```

Check Mailpit:

```text
http://localhost:8025
```

---

## Example AI Request

The AI Sales Assistant can process a lead such as:

```text
Ahmed Khan from Toyota Motors is looking for CRM automation
with a $50,000 budget. Is this lead qualified?
```

The AI can return qualification information, reasoning, and a recommended follow-up action.

---

## Purpose

This project demonstrates how a traditional **MEAN Stack CRM** can be extended with **AI and workflow automation** to automate lead qualification, personalized sales communication, CRM updates, and sales team notifications.
