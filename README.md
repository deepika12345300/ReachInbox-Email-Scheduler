
# ReachInbox – Email Scheduler

ReachInbox is a full-stack email scheduling application that allows users to manage multiple email senders, schedule emails, track email activity, and search email records through a user-friendly dashboard.

## 🚀 Features

- **Google Authentication:** Sign in using your Google account.
- **Dashboard:** View total, scheduled, and sent email statistics.
- **Email Scheduling:** Schedule emails for future delivery.
- **Multiple Senders:** Manage multiple sender email accounts.
- **Bulk Recipients:** Add multiple recipients manually or upload CSV/TXT files.
- **Background Jobs:** Process scheduled emails using BullMQ and Redis.
- **Email Tracking:** Maintain email status and activity records.
- **Email Search:** Search email records using Elasticsearch.
- **Rate Limiting:** Configure the hourly email sending limit.
- **Notifications:** Slack notification integration.
- **Job Monitoring:** Monitor background jobs using Bull Board.

## 🛠️ Tech Stack

**Frontend**
- React
- TypeScript
- Tailwind CSS
- Vite
- Google OAuth

**Backend**
- Node.js
- Express.js
- TypeScript
- Prisma ORM

**Database & Integrations**
- PostgreSQL
- Redis
- BullMQ
- Elasticsearch
- Nodemailer
- Slack API

## 📁 Project Structure

```text
reachinbox-scheduler/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── workers/
│   │   └── server.ts
│   ├── prisma/
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── package.json
│
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd reachinbox-scheduler
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder and configure your environment variables:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your_google_client_id
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
ELASTICSEARCH_URL=http://localhost:9200
```

Add any other environment variables required by your local configuration, including Slack credentials if Slack notifications are enabled.

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local frontend URL shown by Vite, usually:

```text
http://localhost:5173
```

### 4. Start Required Services

Make sure PostgreSQL, Redis, and Elasticsearch are running and accessible using the configured connection URLs.

## 🔄 Application Workflow

1. User signs in through Google Authentication.
2. User opens the ReachInbox dashboard.
3. User selects a sender and enters recipient details.
4. User writes the email subject and body.
5. User selects a future date and time.
6. The backend stores the email and schedules a background job.
7. BullMQ processes the job using Redis.
8. Nodemailer handles email delivery through SMTP.
9. Email records and their statuses are stored and searchable.

## 🔐 Environment Variables & Security

- Never commit `.env` files or credentials to GitHub.
- Keep SMTP passwords, API keys, and secrets private.
- Configure your own Google OAuth credentials.
- Use appropriate database and service connection strings.

## 👩‍💻 Developer

**Deepika Shakya**

B.Tech – Information Technology

GitHub: [Your GitHub Profile](https://github.com/)

---

**ReachInbox – Simplifying Email Scheduling and Management.**

