# Changelog

## Version 2.0.0 - January 17, 2026

### Major Changes

- **Complete Architecture Overhaul**: Migrated from MongoDB + Python backend to Supabase
- **Simplified Structure**: Consolidated backend and frontend into single React application
- **Modern Authentication**: Replaced custom JWT with Supabase Authentication
- **Database Security**: Implemented Row Level Security (RLS) on all tables

### Fixed

- Blank screen on login (was caused by missing backend URL configuration)
- Authentication state management
- API endpoint inconsistencies

### Added

- Supabase database schema with proper relationships
- Automatic profile creation on user registration
- Secure data isolation between households
- Real-time potential for future features

### Removed

- Docker Compose configuration
- Python FastAPI backend
- MongoDB database
- Ollama local LLM integration
- Custom authentication system

### Changed

- Project structure now has all source files in root directory
- Environment variables simplified (only Supabase credentials needed)
- API layer completely rewritten to use Supabase client
- Authentication context updated for Supabase auth
- Updated documentation to reflect new architecture

### Migration Notes

- Existing data from v1.x needs manual migration
- AI features temporarily disabled (require Edge Functions)
- No Docker required for deployment

### Known Limitations

The following features require Supabase Edge Functions to be implemented:
- AI Recipe Import from URLs
- AI Ingredient-based Search
- Automatic Meal Planning
- Calendar Export
- Batch Import

---

## Version 1.x

Previous versions used MongoDB, FastAPI backend, and Docker Compose orchestration.
See git history for details.
