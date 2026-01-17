# Migration Guide - Kitchenry v2.0

## What Changed

The Kitchenry app has been completely migrated from a Docker-based architecture with MongoDB and a Python backend to a modern, cloud-native architecture using Supabase.

## Major Changes

### Architecture

**Before:**
- Separate backend (Python/FastAPI) + frontend (React)
- MongoDB database
- Docker Compose orchestration
- Custom JWT authentication
- Local AI with Ollama

**After:**
- Single React application
- Supabase backend (PostgreSQL database, authentication, storage)
- Simplified deployment
- Supabase Authentication
- Direct database access from frontend

### Project Structure

**Before:**
```
project/
├── backend/         # Python FastAPI server
├── frontend/        # React app
└── docker-compose.yml
```

**After:**
```
project/
├── src/            # React app source
├── public/         # Static assets
└── package.json    # All dependencies
```

### Authentication

**Before:** Custom JWT tokens with localStorage

**After:** Supabase Authentication with session management

### Database

**Before:** MongoDB with custom schemas

**After:** PostgreSQL (Supabase) with:
- Row Level Security (RLS) for all tables
- Automatic timestamps
- Foreign key constraints
- Secure by default

## Features Status

### Working Features

- User registration and login
- Recipe management (create, read, update, delete)
- Meal planning
- Shopping lists
- Household management
- Recipe favorites
- Recipe sharing via links
- Category management

### Features Requiring Edge Functions

The following features need Supabase Edge Functions to be implemented:

- AI Recipe Import from URLs
- AI-powered fridge search
- Automatic meal planning
- Calendar export (.ical)
- Batch recipe import from other platforms
- Home Assistant integration

These features will show an error message until Edge Functions are added.

## Getting Started

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Create an account and start adding recipes!

## Data Migration

If you have existing data from the old version, it will need to be manually migrated to Supabase. The database schema is similar but not identical.

## Environment Variables

The app automatically uses the Supabase credentials configured in the `.env` file. No additional configuration is needed for basic functionality.

## Benefits of the New Architecture

1. **Simplified Deployment**: No Docker required, just deploy the React app
2. **Better Security**: Row Level Security ensures data isolation
3. **Scalability**: Supabase handles scaling automatically
4. **Real-time Updates**: Built-in support for real-time features
5. **Easier Maintenance**: Single codebase instead of separate backend/frontend
6. **Modern Authentication**: Secure authentication out of the box
7. **No Server Management**: Fully serverless architecture

## Known Issues

- None currently

## Support

If you encounter any issues, please report them on GitHub.
