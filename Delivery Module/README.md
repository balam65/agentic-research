# Output & Delivery Module

This repository now includes a production-ready output and delivery module with:

- `backend/`: FastAPI service for Supabase reads, formatting, delivery, and logging
- `frontend/`: Next.js App Router dashboard for viewing data and triggering deliveries

## Backend setup

1. `cd backend`
2. `python -m venv .venv && source .venv/bin/activate`
3. `pip install -r requirements.txt`
4. `cp .env.example .env`
5. Fill in:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AWS_*` and `S3_BUCKET_NAME` for S3 delivery
   - `DEFAULT_WEBHOOK_URL` or `WEBHOOK_URL_MAP` for webhook delivery
   - `API_BASE_URL` for backend-generated download links
6. Run the API:
   - `uvicorn app.main:app --reload --port 8000`

## Frontend setup

1. `cd frontend`
2. `npm install`
3. `cp .env.example .env.local`
4. Set `NEXT_PUBLIC_API_BASE_URL=http://192.168.1.250:8000`
5. Run the dashboard:
   - `npm run dev`

## Expected Supabase tables

### `processed_data`

- `id uuid`
- `client_id text`
- `payload jsonb`
- `created_at timestamp`

### `delivery_logs`

- `id uuid`
- `client_id text`
- `status text`
- `format text`
- `delivery_type text`
- `timestamp timestamp`

## API surface

- `GET /health`
- `GET /data?client_id=...`
- `GET /logs?client_id=...`
- `GET /stats?client_id=...`
- `POST /deliver`

## Notes

- Secrets are never exposed to the browser.
- CSV generation is dynamic and flattens nested JSON payloads.
- Delivery attempts are logged to `delivery_logs` on both success and failure.
