# PayFlow project notes

- Keep payment policy in `backend/app/services`, storage behavior behind the repository contract, and HTTP wiring in `backend/app/api` and `backend/app/main.py`.
- Keep browser API access in `frontend/src/lib` and feature API modules. Derive totals, search, and customer summaries from the payment list with pure selectors and exact integer minor units.
- This is a simulation only. Do not add credentials, processor integrations, refund APIs, customer APIs, or export endpoints.
- Do not commit local `.env` files, dependency directories, Python environments, or build output.
