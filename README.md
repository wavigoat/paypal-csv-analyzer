# PayPal Analytics Ledger

A full-stack financial dashboard designed to ingest, validate, and analyze PayPal transaction CSVs. The application provides an interactive ledger system that calculates key business metrics, visualizes revenue trends, and tracks customer retention over time.

## Features

* **Automated CSV Validation:** Detects valid PayPal CSV formats, verifies date/amount columns, handles multiple currencies, and automatically removes duplicate entries.
* **Revenue Dashboards:** Visualizes gross and net revenue, fee breakdowns, and refund totals using interactive Recharts components.
* **Trend Analysis:** Tracks revenue across timeseries line charts, monthly bar charts, and day-of-the-week performance to identify growth periods.
* **Customer Insights:** Calculates unique/repeat customer ratios, retention rates, and highlights top spenders.
* **Dynamic Filtering:** Allows users to filter ledger data by specific date ranges and itemized categories.

## Tech Stack

* **Frontend:** React, TypeScript, Vite, Recharts, Lucide-react, Axios
* **Backend:** REST API (Port 8000)
* **Infrastructure:** Docker, AWS (PostgreSQL - In Progress)

## Local Development Setup

1. **Clone the repository:**
   `git clone <your-repo-url>`
2. **Install frontend dependencies:**
   `npm install`
3. **Environment Configuration:**
   Create a `.env.development` file in the root directory and set your API base URL (defaults to localhost:8000 if unset):
   `VITE_API_BASE=http://localhost:8000`
4. **Run the development server:**
   `npm run dev`

## Current Status & Next Steps
The core React frontend and CSV processing pipelines are complete. The project is currently being containerized via Docker, with an ongoing migration to route parsed transaction data into an AWS-hosted PostgreSQL database for persistent storage rather than session-based uploads.
