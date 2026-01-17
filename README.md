# Kitchenry

A modern, cloud-native recipe management application for families. Organize recipes, plan meals, generate shopping lists, and share with your household.

## Features

- **Recipe Management**: Create, edit, and organize recipes with images, categories, and tags
- **Meal Planning**: Weekly calendar to plan breakfast, lunch, dinner, and snacks
- **Shopping Lists**: Auto-generate from recipes or create manually
- **Family Sharing**: Create households and share everything with family members
- **Recipe Sharing**: Share via link with expiration
- **Favorites**: Mark and filter your favorite recipes
- **PWA Support**: Install on mobile devices for app-like experience
- **Secure Authentication**: Built-in user authentication with Supabase

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The app will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## Database Setup

The app uses Supabase for the backend. The database schema includes:

- `profiles` - User profiles
- `households` - Household/family groups
- `recipes` - Recipe data with ingredients and instructions
- `meal_plans` - Meal planning
- `shopping_lists` - Shopping lists
- `favorites` - User favorites
- `categories` - Recipe categories
- `shared_recipes` - Public recipe sharing

All tables have Row Level Security (RLS) enabled to ensure data privacy.

## Project Structure

```
project/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── context/       # React context providers
│   ├── lib/           # Utility functions and API
│   └── hooks/         # Custom React hooks
├── public/            # Static assets
└── package.json       # Dependencies
```

## Advanced Features

Some advanced features require Supabase Edge Functions to be implemented:

- AI Recipe Import from URLs
- AI Ingredient-based Recipe Search
- Automatic Meal Planning
- Calendar Export (.ical)
- Batch Import from other platforms

These features will display an error message until Edge Functions are added.

## Technology Stack

- **Frontend**: React 19 with Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **UI Components**: Radix UI + shadcn/ui
- **Animation**: Framer Motion
- **Styling**: Tailwind CSS with custom design tokens

## License

MIT - Feel free to self-host, modify, and share!
