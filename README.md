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

```bash
git clone https://github.com/Domocn/Recipe-App.git mise
cd mise
docker-compose up -d
```

Open **http://localhost:3000** and create an account.

## AI Setup

Mise supports three AI providers. Choose one:

### Option 1: Embedded (Easiest)

No setup required. In Settings → AI → select **Embedded (100% Offline)** → choose a model → it downloads automatically.

| Model | Download | RAM Required |
|-------|----------|--------------|
| Phi-3 Mini | 2.2 GB | 4 GB |
| Llama 3.2 3B | 2.0 GB | 4 GB |
| Mistral 7B | 4.4 GB | 8 GB |

### Option 2: Ollama (Faster)

```bash
docker exec mise-ollama ollama pull llama3
```

In Settings → AI → select **Ollama (Local)**.

### Option 3: OpenAI (Cloud)

In Settings → AI → select **OpenAI** → enter your API key.

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Web app |
| Backend | http://localhost:8001 | API |
| Ollama | http://localhost:11434 | Local LLM |
| MongoDB | localhost:27017 | Database |

## Configuration

Environment variables in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key (if using OpenAI) |
| `OLLAMA_HOST` | http://ollama:11434 | Ollama server URL |
| `JWT_SECRET` | (generated) | Auth token secret |
| `DB_NAME` | mise | MongoDB database name |

## Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build

# Reset database
docker-compose down -v
docker-compose up -d
```

## Tech Stack

- **Frontend:** React, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend:** FastAPI, Python
- **Database:** MongoDB
- **AI:** OpenAI, Ollama, GPT4All (embedded)
- **Infrastructure:** Docker, Nginx

## License

MIT
