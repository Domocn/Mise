# Mise 🍳

A self-hostable recipe app for families. Organize recipes, plan meals, generate shopping lists, and share with your household.

> *Mise* — from "mise en place," meaning everything in its place.

## Features

- **Recipe Management** — Create, edit, and organize recipes with images, tags, and categories
- **AI Import** — Paste any recipe URL and AI extracts it automatically
- **Quick Add** — Paste raw text and AI parses it into a structured recipe
- **Batch Import** — Import from Paprika, Cookmate, Recipe Keeper, or JSON
- **Meal Planning** — Weekly calendar for breakfast, lunch, dinner, and snacks
- **Auto Meal Plan** — AI generates a balanced weekly plan from your recipes
- **Shopping Lists** — Auto-generate from meal plans or create manually
- **What's in My Fridge** — Enter ingredients you have, find matching recipes
- **Family Sharing** — Create households and share with family members
- **Recipe Scaling** — Adjust servings and ingredients scale automatically
- **Recipe Sharing** — Share via link, copy as text, or download recipe cards
- **Calendar Sync** — Export to Google Calendar, Apple Calendar, Outlook
- **Dark Mode** — System preference detection with manual toggle
- **PWA Support** — Install on mobile for app-like experience
- **Push Notifications** — Meal reminders and shopping alerts
- **Offline AI** — Embedded AI that works without internet

## Quick Start

### Option 1: Docker Compose (Command Line)

```bash
git clone https://github.com/Domocn/Mise.git
cd Mise
docker-compose up -d
```

Open **http://localhost:3000** and create an account.

### Option 2: Portainer

1. Go to **Stacks** → **Add Stack**
2. Name it `mise`
3. Choose one of:
   - **Upload** — Upload the `docker-compose.yml` file
   - **Repository** — Enter `https://github.com/Domocn/Mise`, compose path `docker-compose.yml`
   - **Web editor** — Paste the docker-compose below
4. Click **Deploy the stack**
5. Open **http://your-server:3000**

#### First Time Setup

1. Generate a secret: `openssl rand -base64 32`
2. Replace `<32-byte-secret>` in docker-compose with your generated key
3. Deploy and create your account
4. Go to `http://host-ip:3001/server` to configure the server connection

### Docker Compose File

<details>
<summary>Click to expand docker-compose.yml</summary>

> **Note:** This is the minimal version. The full `docker-compose.yml` in the repo includes OpenPanel analytics and build-from-source options.

```yaml
services:
  mise:
    image: domocn/mise:latest
    container_name: mise-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - mise_uploads:/app/uploads
      - mise_models:/app/models
    environment:
      # Core settings (required)
      DATABASE_URL: mongodb://db:27017/mise
      JWT_SECRET: <32-byte-secret>  # Generate with: openssl rand -base64 32

      # ─────────────────────────────────────────────────────────────────────────
      # AI CONFIGURATION (choose one)
      # ─────────────────────────────────────────────────────────────────────────
      
      # Option 1: Embedded AI (100% offline, no setup needed)
      # Models download automatically on first use
      LLM_PROVIDER: embedded
      # EMBEDDED_MODEL: Phi-3-mini-4k-instruct.Q4_0.gguf  # Default, 2.2GB, 4GB RAM
      # EMBEDDED_MODEL: Llama-3.2-3B-Instruct-Q4_0.gguf  # 2.0GB, 4GB RAM
      # EMBEDDED_MODEL: Mistral-7B-Instruct-v0.3.Q4_0.gguf  # 4.4GB, 8GB RAM

      # Option 2: Ollama (faster, requires ollama service below)
      # LLM_PROVIDER: ollama
      # OLLAMA_URL: http://ollama:11434
      # OLLAMA_MODEL: llama3

      # Option 3: OpenAI (cloud, requires API key)
      # LLM_PROVIDER: openai
      # OPENAI_API_KEY: sk-your-api-key-here

      # Option 4: Claude/Anthropic (cloud, requires API key)
      # LLM_PROVIDER: anthropic
      # ANTHROPIC_API_KEY: sk-ant-your-api-key-here

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 1m
      timeout: 15s
      retries: 3
      start_period: 30s
    depends_on:
      - db

  db:
    image: mongo:7
    container_name: mise-db
    restart: unless-stopped
    volumes:
      - mise_db:/data/db

  # ─────────────────────────────────────────────────────────────────────────
  # OPTIONAL: Ollama for faster local AI (uncomment if using LLM_PROVIDER: ollama)
  # ─────────────────────────────────────────────────────────────────────────
  # ollama:
  #   image: ollama/ollama:latest
  #   container_name: mise-ollama
  #   restart: unless-stopped
  #   ports:
  #     - "11434:11434"
  #   volumes:
  #     - mise_ollama:/root/.ollama

volumes:
  mise_db:
  mise_uploads:
  mise_models:
```

</details>

## AI Setup

Mise supports four AI providers. Choose one:

### Option 1: Embedded (Easiest)

No setup required. In Settings → AI → select **Embedded (100% Offline)** → choose a model → it downloads automatically.

| Model | Download | RAM Required |
|-------|----------|--------------|
| Phi-3 Mini | 2.2 GB | 4 GB |
| Llama 3.2 3B | 2.0 GB | 4 GB |
| Mistral 7B | 4.4 GB | 8 GB |

### Option 2: Claude (Recommended Cloud)

In Settings → AI → select **Claude** → enter your [Anthropic API key](https://console.anthropic.com/settings/keys).

Uses Claude Sonnet 4 — excellent for recipe parsing and meal planning.

### Option 3: Ollama (Faster Local)

```bash
docker exec mise-ollama ollama pull llama3
```

In Settings → AI → select **Ollama (Local)**.

### Option 4: OpenAI

In Settings → AI → select **OpenAI** → enter your API key.

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| Mise | http://localhost:3000 | Web app + API |
| MongoDB | localhost:27017 | Database |
| Ollama (optional) | http://localhost:11434 | Faster local LLM |

## Network Access Setup

If accessing Mise from other devices on your network (phone, tablet, other computers), you need to configure the backend URL:

### Option 1: Environment Variable (Recommended)

Set the `BACKEND_URL` to your server's IP address:

```bash
# Find your server's IP
hostname -I | awk '{print $1}'

# Set in .env file
echo "BACKEND_URL=http://YOUR_SERVER_IP:8001" > .env

# Or export directly
export BACKEND_URL=http://192.168.1.100:8001
```

Then rebuild:
```bash
docker-compose build frontend
docker-compose up -d
```

### Option 2: Edit docker-compose.yml

Change line 82 in `docker-compose.yml`:

```yaml
frontend:
  environment:
    - REACT_APP_BACKEND_URL=http://YOUR_SERVER_IP:8001
```

Replace `YOUR_SERVER_IP` with your actual server IP (e.g., `192.168.1.100`).

### Option 3: Manual Configuration

1. Open `http://YOUR_SERVER_IP:3001/server` in your browser
2. Enter `http://YOUR_SERVER_IP:8001` as the server URL
3. Click **Test** then **Connect & Continue**

> **Note:** Using `localhost` only works when accessing from the same machine. For network access, use your server's actual IP address.

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | MongoDB connection string |
| `JWT_SECRET` | (required) | Auth token secret (32+ chars) |
| `LLM_PROVIDER` | `embedded` | `embedded`, `anthropic`, `ollama`, or `openai` |
| `EMBEDDED_MODEL` | Phi-3 Mini | Model for embedded AI |
| `ANTHROPIC_API_KEY` | — | Anthropic API key (if using Claude) |
| `OLLAMA_URL` | — | Ollama server URL (if using Ollama) |
| `OPENAI_API_KEY` | — | OpenAI API key (if using OpenAI) |

## Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f mise

# Update to latest version
docker-compose pull
docker-compose up -d

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

## Tech Stack

- **Frontend:** React, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend:** FastAPI, Python
- **Database:** MongoDB
- **AI:** Claude (Anthropic), OpenAI, Ollama, GPT4All (embedded)
- **Infrastructure:** Docker, Nginx

## Reverse Proxy (Optional)

If running behind Nginx Proxy Manager, Traefik, or Caddy:

```
your-domain.com → localhost:3000
```

Add your domain to `TRUSTED_ORIGINS`:

```yaml
environment:
  TRUSTED_ORIGINS: https://your-domain.com
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to database | Check if `mise-db` container is running |
| AI features not working | Check logs: `docker-compose logs -f mise` |
| App won't start | Verify `JWT_SECRET` is set (not placeholder) |
| Port already in use | Change port `3000:3000` to `3001:3000` |

### View Logs

```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f mise
```

## License

MIT
