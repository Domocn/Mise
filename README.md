# Mise 🍳

A self-hostable recipe app for families. Organize recipes, plan meals, generate shopping lists, and share with your household.

## Features

- **Recipe Management**: Create, edit, and organize recipes with images, categories, and tags
- **AI Import**: Paste any recipe URL and AI extracts it automatically
- **Quick Add**: Paste text from any source and AI parses it into a recipe
- **Batch Import**: Import recipes from Paprika, Cookmate, Recipe Keeper, or JSON
- **Meal Planning**: Weekly calendar to plan breakfast, lunch, dinner, and snacks
- **Auto Meal Plan**: Let AI generate a balanced weekly meal plan from your recipes
- **Shopping Lists**: Auto-generate from recipes or create manually
- **"What's in My Fridge"**: Enter ingredients you have, find matching recipes
- **Family Sharing**: Create households and share everything with family members
- **Recipe Sharing**: Share via link, copy as text, or download beautiful recipe cards
- **Calendar Sync**: Export meal plans to Google Calendar, Apple Calendar, Outlook (iCal)
- **Home Assistant**: REST API sensors for meal reminders and shopping list
- **PWA Support**: Install on mobile devices for app-like experience
- **Push Notifications**: Get meal reminders and shopping alerts
- **Dark Mode**: Easy on the eyes with automatic system preference detection
- **Local LLM**: Run AI features without any API keys using Ollama
- **Embedded AI**: Fully offline AI that runs inside the app (no external services needed)
- **Bug Tracker**: Report issues directly on GitHub

## Quick Start with Docker

### Prerequisites
- Docker & Docker Compose
- 4GB+ RAM (8GB recommended for local LLM)

### 1. Clone and Start

```bash
git clone <your-repo>
cd mise

# Start all services (MongoDB, Ollama, Backend, Frontend)
docker-compose up -d

# Pull the LLM model (first time only, ~4GB download)
docker exec mise-ollama ollama pull llama3
```

### 2. Access the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Ollama**: http://localhost:11434

### 3. Connect from Mobile

1. Find your computer's local IP: `ip addr` or `ipconfig`
2. Open `http://YOUR_IP:3000` on your phone
3. Tap "Add to Home Screen" to install the PWA
4. In the app, go to Settings → Change Server → enter `http://YOUR_IP:8001`

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Security (CHANGE THIS!)
JWT_SECRET=your-super-secret-key-here

# LLM Provider: 'ollama' (local) or 'openai' (cloud)
LLM_PROVIDER=ollama

# For Ollama (local LLM)
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3

# For OpenAI (if using cloud)
# LLM_PROVIDER=openai
# EMERGENT_LLM_KEY=your-api-key
```

### Ollama Models

Choose a model based on your hardware:

| Model | RAM Required | Speed | Quality |
|-------|-------------|-------|---------|
| `llama3` | 8GB | Medium | Best |
| `mistral` | 8GB | Fast | Good |
| `phi3` | 4GB | Fastest | Good |
| `llama3:70b` | 48GB | Slow | Excellent |

Change model:
```bash
# Pull new model
docker exec mise-ollama ollama pull mistral

# Update docker-compose.yml
OLLAMA_MODEL=mistral

# Restart backend
docker-compose restart backend
```

### Embedded AI (100% Offline)

For truly offline operation without any external services, use the embedded AI option:

1. In the app, go to Settings → AI Settings
2. Select "Embedded" as the provider
3. Choose a model (Phi-3 Mini recommended for most systems)
4. The model downloads automatically on first use (~2-5GB)

**Available embedded models:**

| Model | Download Size | RAM Required | Quality |
|-------|--------------|--------------|---------|
| Phi-3 Mini (Recommended) | 2.2GB | 4GB | Good |
| Llama 3.2 3B | 2.0GB | 4GB | Good |
| Mistral 7B | 4.4GB | 8GB | Better |

**When to use embedded vs Ollama:**
- **Embedded**: Simpler setup, no extra service to manage, works on any system
- **Ollama**: More model choices, faster on supported hardware, better for power users

### GPU Acceleration (NVIDIA)

Uncomment the GPU section in `docker-compose.yml`:

```yaml
ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

## Manual Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Set environment variables
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="mise"
export JWT_SECRET="your-secret"
export LLM_PROVIDER="ollama"
export OLLAMA_URL="http://localhost:11434"

# Run
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend

```bash
cd frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```

### Ollama

```bash
# Install Ollama: https://ollama.ai
ollama serve
ollama pull llama3
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/recipes` | List recipes |
| POST | `/api/recipes` | Create recipe |
| GET | `/api/recipes/:id` | Get recipe |
| PUT | `/api/recipes/:id` | Update recipe |
| DELETE | `/api/recipes/:id` | Delete recipe |
| POST | `/api/recipes/:id/share` | Create share link |
| GET | `/api/shared/:id` | Get shared recipe (public) |
| POST | `/api/ai/import-url` | AI extract recipe from URL |
| POST | `/api/ai/import-text` | AI parse pasted recipe text |
| POST | `/api/ai/auto-meal-plan` | AI generate weekly meal plan |
| POST | `/api/ai/fridge-search` | Find recipes by ingredients |
| GET | `/api/meal-plans` | List meal plans |
| POST | `/api/meal-plans` | Create meal plan |
| GET | `/api/calendar/ical` | Export meals as iCal |
| GET | `/api/shopping-lists` | List shopping lists |
| POST | `/api/shopping-lists` | Create shopping list |
| POST | `/api/import/platform` | Import from Paprika/Cookmate |
| GET | `/api/homeassistant/today` | Today's meals for HA |
| GET | `/api/homeassistant/shopping` | Shopping list for HA |
| POST | `/api/notifications/subscribe` | Subscribe to push |
| GET | `/api/health` | Health check |

## Home Assistant Integration

Add to your `configuration.yaml`:

```yaml
rest:
  - resource: http://YOUR_KITCHENRY_IP:8001/api/homeassistant/today
    headers:
      Authorization: Bearer YOUR_TOKEN
    sensor:
      - name: "Mise Today's Meals"
        value_template: "{{ value_json.summary }}"
        json_attributes:
          - meals
          - next_meal
          - count

  - resource: http://YOUR_KITCHENRY_IP:8001/api/homeassistant/shopping
    headers:
      Authorization: Bearer YOUR_TOKEN
    sensor:
      - name: "Mise Shopping"
        value_template: "{{ value_json.unchecked }} items to buy"
        json_attributes:
          - items
          - list_name
```

Create automations for meal reminders:

```yaml
automation:
  - alias: "Dinner Reminder"
    trigger:
      platform: time
      at: "17:30:00"
    action:
      service: notify.mobile_app
      data:
        title: "Time to cook!"
        message: "{{ state_attr('sensor.mise_today_s_meals', 'next_meal').recipe_title }}"
```

## Calendar Sync

Export your meal plan to Google Calendar, Apple Calendar, or Outlook:

1. Go to Meal Planner → Click "Export"
2. Download the `.ics` file
3. Import into your calendar app

Or set up automatic sync by subscribing to:
`http://YOUR_IP:8001/api/calendar/ical?start_date=2024-01-01&end_date=2024-12-31`

## Bug Reports & Feature Requests

Found a bug or have an idea? Report it on GitHub:

- [Report a Bug](https://github.com/Domocn/Recipe-App/issues/new?template=bug_report.md&labels=bug)
- [Request a Feature](https://github.com/Domocn/Recipe-App/issues/new?template=feature_request.md&labels=enhancement)
- [Community Discussions](https://github.com/Domocn/Recipe-App/discussions)

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Ollama (local) or OpenAI (cloud)
- **Containerization**: Docker

## Troubleshooting

### Ollama not responding
```bash
# Check if Ollama is running
docker logs mise-ollama

# Restart Ollama
docker-compose restart ollama
```

### AI features slow
- Use a smaller model: `phi3` instead of `llama3`
- Enable GPU acceleration
- Increase Docker memory limit

### Can't connect from mobile
- Ensure phone is on same WiFi network
- Check firewall allows ports 3000 and 8001
- Use computer's local IP, not `localhost`

## License

MIT - Feel free to self-host, modify, and share!
