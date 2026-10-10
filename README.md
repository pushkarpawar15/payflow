# PayFlow

PayFlow is a fictional payment management dashboard. It stores simulated payment records only; it does not collect payment credentials or move money.

## Local development

Run the API from `backend/` with Python 3.12 and `uvicorn app.main:app --reload --port 8000`. Run the browser app from `frontend/` with Node 20+, `npm ci`, and `npm run dev`. Copy each `.env.example` to `.env` and set `VITE_API_BASE_URL=http://localhost:8000` for local development.

The API defaults to an in-memory repository with fictional seed data. For deployment, set `PAYFLOW_STORAGE_BACKEND=firestore`, configure Application Default Credentials and `GOOGLE_CLOUD_PROJECT`, and set `PAYFLOW_SEED_DATA=false`. The frontend calls the API directly; configure `PAYFLOW_CORS_ORIGINS` to the deployed web origin. No credentials are included here.

## Deployment

### Docker Compose

Run the full app locally with Docker Compose:

```sh
docker compose up --build
```

Open <http://localhost:8080>. The web container serves the production Vite build and proxies `/payments` and `/health` to the API container. The default Compose configuration uses the in-memory repository with fictional seed data, so records reset when the API container is recreated. Stop the app with `docker compose down`.

Compose can also run on a deployment host:

```sh
WEB_PORT=80 docker compose up --build -d
```

For Firestore, set `PAYFLOW_STORAGE_BACKEND=firestore`, `GOOGLE_CLOUD_PROJECT`, and `PAYFLOW_SEED_DATA=false` in the environment where Compose runs, then provide Google Application Default Credentials to the API container using your deployment platform's secret and identity mechanism. The frontend can be built with a direct API URL by setting `VITE_API_BASE_URL`; by default it uses the same-origin proxy. Do not put credentials in the Compose file or image.

The backend Dockerfile can also be deployed independently to Cloud Run. Firebase Hosting can serve the Vite build. Deployments are intentionally not automated.
