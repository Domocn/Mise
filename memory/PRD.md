# Kitchenry - Self-Hostable Recipe App

## Original Problem Statement
Build a recipe app that can be self-hosted and shared with friends/family. Features include:
- Recipe CRUD with categories/tags
- Meal planning/calendar
- Shopping list generation
- Recipe sharing with family members
- AI-powered recipe import from URLs
- Multi-user family/household accounts
- Local image uploads
- "What's in my fridge" AI feature to find matching recipes
- Local AI support (Ollama) for fully offline operation
- Import recipes from other apps (Paprika, Cookmate, etc.)
- Recipe scaling (adjust servings)
- Recipe favorites/bookmarks
- Recipe print view

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI Integration**: OpenAI GPT-4o via Emergent LLM Key, or Ollama (local)
- **Deployment**: Docker Compose for self-hosting

## User Personas
1. **Home Cook**: Primary user who creates and manages recipes
2. **Family Member**: Household member who shares recipes and meal plans
3. **Meal Planner**: User focused on weekly planning and shopping

## Core Requirements
- [x] User authentication (register/login/logout)
- [x] Recipe CRUD operations
- [x] Recipe categories and tags
- [x] Meal planning calendar
- [x] Shopping list management
- [x] Household/family accounts
- [x] AI recipe import from URL
- [x] AI recipe import from pasted text (Quick Add)
- [x] "What's in my fridge" ingredient search
- [x] Local image uploads for recipes
- [x] Local LLM support (Ollama)
- [x] PWA support for mobile installation
- [x] Recipe sharing (URL, text copy, recipe card image)
- [x] Calendar sync (iCal export)
- [x] Home Assistant integration
- [x] Import from other platforms (Paprika, Cookmate, JSON)
- [x] Push notification backend infrastructure
- [x] Recipe favorites/bookmarks
- [x] Recipe scaling (adjust servings)
- [x] Recipe print view

## What's Been Implemented

### January 15, 2025 - Iteration 3
- **Recipe Favorites**: Heart button to favorite recipes, filter to show only favorites
- **Recipe Scaling**: +/- buttons to adjust servings, ingredients update automatically
- **Recipe Print View**: Printer button with CSS print styles for clean printed recipes
- **Backend Endpoints**: `/recipes/{id}/favorite`, `/recipes/{id}/scaled`, `/recipes/{id}/print`, `/favorites`

### January 15, 2025 - Iteration 2
- **Rebranding**: App renamed from CookShare to **Kitchenry**
- **Recipe Import UI**: New `/recipes/import-batch` page for importing from Paprika, Cookmate, or JSON
- **Push Notifications**: Enhanced service worker with push notification handlers
- **README Update**: Comprehensive documentation with all features

### Previous Implementation
- Full-stack Recipe CRUD with image uploads
- AI-powered recipe import from URL and pasted text
- Auto meal plan generation using AI
- Weekly meal planner calendar
- Shopping list generation from recipes
- Household/family sharing
- Settings page with LLM provider selection (OpenAI/Ollama)
- Server configuration page for self-hosted instances
- PWA manifest and service worker
- Docker Compose setup for self-hosting
- Home Assistant REST API integration
- Calendar iCal export

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (Important) 
- [x] Recipe favorites/bookmarks ✅
- [x] Recipe scaling ✅
- [x] Recipe print view ✅
- [ ] Push notifications frontend (send meal reminders via browser)

### P2 (Nice to Have)
- [ ] Duplicate recipe feature
- [ ] Bulk meal plan operations
- [ ] Recipe nutrition info (AI-generated)
- [ ] Weekly meal plan templates
- [ ] Recipe notes/modifications
- [ ] Backend refactoring (server.py is 1400+ lines)

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Households
- POST /api/households
- GET /api/households/me
- GET /api/households/members
- POST /api/households/invite
- POST /api/households/leave

### Recipes
- GET /api/recipes (supports `favorites_only=true`)
- POST /api/recipes
- GET /api/recipes/{id}
- PUT /api/recipes/{id}
- DELETE /api/recipes/{id}
- POST /api/recipes/{id}/image
- POST /api/recipes/{id}/share
- **POST /api/recipes/{id}/favorite** - Toggle favorite status
- **GET /api/recipes/{id}/scaled?servings=X** - Get scaled ingredients
- **GET /api/recipes/{id}/print** - Get print-formatted recipe

### Favorites
- **GET /api/favorites** - Get all favorited recipes

### AI
- POST /api/ai/import-url
- POST /api/ai/import-text
- POST /api/ai/auto-meal-plan
- POST /api/ai/fridge-search

### Import
- POST /api/import/platform (Paprika, Cookmate, JSON)

### Meal Plans
- GET /api/meal-plans
- POST /api/meal-plans
- DELETE /api/meal-plans/{id}
- GET /api/calendar/ical

### Shopping Lists
- GET /api/shopping-lists
- POST /api/shopping-lists
- GET /api/shopping-lists/{id}
- PUT /api/shopping-lists/{id}
- DELETE /api/shopping-lists/{id}
- POST /api/shopping-lists/from-recipes

### Settings
- GET /api/settings/llm
- PUT /api/settings/llm
- POST /api/settings/llm/test

### Notifications
- POST /api/notifications/subscribe
- GET /api/notifications/settings
- PUT /api/notifications/settings

### Home Assistant
- GET /api/homeassistant/config
- GET /api/homeassistant/today
- GET /api/homeassistant/shopping

### Utilities
- GET /api/categories
- GET /api/uploads/{filename}
- GET /api/health
- GET /api/config

## Test Reports
- `/app/test_reports/iteration_1.json` - Initial MVP tests
- `/app/test_reports/iteration_2.json` - Branding + Import tests
- `/app/test_reports/iteration_3.json` - Favorites + Scaling + Print tests (39/39 passed)

## Test Credentials
- Email: test@test.com
- Password: password

## Next Tasks
1. Complete push notification frontend (trigger notifications from meal planner)
2. Add duplicate recipe feature
3. Backend refactoring into router modules
