# DCC API

Rust backend — Axum 0.7, PostgreSQL, Redis.

## Quick start

### 1. Start infrastructure

```bash
# From the repo root
docker-compose up -d
```

### 2. Configure environment

```bash
cd apps/api
cp .env.example .env   # already created; edit if needed
```

### 3. Prepare sqlx query cache (one-time, needs running Postgres)

```bash
cargo install sqlx-cli --no-default-features --features rustls,postgres
cargo sqlx prepare
```

This generates `.sqlx/` which lets the project build without a live database afterwards.

### 4. Run

```bash
cargo run
```

Server listens on `http://0.0.0.0:8080`.
- API: `http://localhost:8080/v1/...`
- WebSocket: `ws://localhost:8080/ws?token=<accessToken>`

## Endpoints

See `../../README.md` for the full API contract.
