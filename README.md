# 🚀 WakeBot

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Neon PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Keep your free Render, Railway, and Fly.io servers awake — automatically.**

Free hosting platforms often put your server to sleep after 15 minutes of inactivity. **WakeBot** sends scheduled GET requests to keep your apps warm and responsive, ensuring zero cold starts and a better experience for your users. No signup, no passwords, no hassle.

---

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Folder Structure](#-folder-structure)
- [⚙️ Setup & Installation](#️-setup--installation)
- [🔐 Environment Variables](#-environment-variables)
- [🚀 Deployment](#-deployment)
- [💻 Usage](#-usage)
- [📜 Available Scripts](#-available-scripts)

---

## Project Overview
WakeBot is a high-performance uptime companion designed specifically for modern developers. Built on Cloudflare's edge infrastructure, it triggers parallelized pings based on custom intervals (1–60 minutes). It features a sleek, glass-morphic dashboard that requires only a unique handle to get started, making it the most frictionless way to manage server availability.

## ✨ Key Features
- **Zero Cold Starts**: Prevents hibernation on idle-sensitive platforms.
- **Modern Dashboard**: A polished, responsive UI with light/dark mode support.
- **Zero Authentication**: Manage monitors with a simple `@username` handle.
- **Edge Cron Triggers**: High-reliability scheduling powered by Cloudflare Workers.
- **Live Monitoring**: Manual "Ping Now" buttons and real-time success tracking.
- **Serverless Database**: Data persistence via Neon's serverless PostgreSQL.

## 🛠️ Tech Stack
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) (Edge Computing)
- **Database**: [Neon PostgreSQL](https://neon.tech/) (Serverless)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS (Modern Glassmorphism)
- **Deployment**: [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## 📂 Folder Structure
```text
wakebot/
├── src/
│   ├── worker.ts      # Core logic (API, Frontend, and Scheduled Tasks)
│   └── icon.svg       # Project branding assets
├── .dev.vars          # Local environment secrets (ignored by git)
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── wrangler.toml      # Cloudflare Workers configuration
└── README.md          # Project documentation
```

## ⚙️ Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) or `npm`
- A [Cloudflare](https://dash.cloudflare.com/sign-up) account
- A [Neon](https://neon.tech) database project

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/nishantsingh02/WakeBot
   cd wakebot
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure local variables:**
   Create a `.dev.vars` file in the root directory:
   ```text
   DATABASE_URL=postgres://user:password@something.neon.tech/neondb
   ```

4. **Run development server:**
   ```bash
   pnpm run dev
   ```

## 🔐 Environment Variables
The application requires the following secret to be configured:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Your Neon PostgreSQL connection string (starting with `postgres://`) |

For production, set this using Wrangler:
```bash
npx wrangler secret put DATABASE_URL
```

## 🚀 Deployment

1. **Log in to Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Deploy the Worker:**
   ```bash
   pnpm run deploy
   ```

3. **Initialize the Database:**
   Visit `https://your-worker-url.workers.dev/api/init` in your browser to create the necessary tables.

## 💻 Usage
1. **Access the Dashboard**: Open your deployed URL.
2. **New User**: Pick a handle, enter your server URL, select an interval, and hit "Start Monitoring".
3. **Returning User**: Click the "Returning User" tab and enter your handle to access your dashboard.
4. **Manual Test**: Use the "Ping Now" button next to any monitor to verify connectivity instantly.

## 📜 Available Scripts
- `pnpm run dev`: Starts the local development server with Wrangler.
- `pnpm run deploy`: Builds and deploys the project to Cloudflare.
- `pnpm run cf-typegen`: Generates TypeScript types for your Cloudflare environment.

---

Built with ❤️ by [Your Name]
