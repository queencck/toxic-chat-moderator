# Toxic Chat Dashboard

React + Tailwind dashboard for the Toxic Chat Moderator API.

## Features

- Fetch all messages from the moderation API
- Show most recent flagged message
- Display total moderated messages
- Display flagged percentage

## Run

1. Start the FastAPI backend on port 8000.
2. Install frontend dependencies:

   npm install

3. Start frontend dev server:

   npm run dev

The Vite dev server proxies `/api/*` to `http://localhost:8000`.

## Optional env

Set `VITE_API_BASE` if you do not want to use the proxy. Example:

VITE_API_BASE=https://my-api.example.com
