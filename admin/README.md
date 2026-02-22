# WordMaster Admin Panel

Web-based admin interface for managing WordMaster platform.

## Features

- 👥 **User Management** - View, edit, and manage user accounts
- 🌍 **Language Management** - Add and configure language pairs
- 📚 **Word Database** - Import, edit, and organize vocabulary
- 📊 **Analytics** - Platform statistics and insights
- 🔧 **Database Tools** - Health checks and maintenance

## Quick Start

### Option 1: React Admin (Recommended - Full Featured)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The admin panel will run on http://localhost:5173

### Option 2: AdminJS (Quickest - Auto-generated)

If you prefer a quick auto-generated admin panel:

```bash
cd ../backend
npm install adminjs @adminjs/express @adminjs/sql @adminjs/postgresql
```

Then follow instructions in `/docs/ADMIN_SETUP.md`

## Configuration

### API Connection

The admin panel connects to the backend API at:
- **Development**: `http://localhost:3000/api/admin`
- **Production**: Set `VITE_API_URL` environment variable

### Authentication

Uses JWT tokens from the backend authentication system.
Requires users with `admin` or `superadmin` role.

## Project Structure

```
admin/
├── src/
│   ├── App.jsx           # Main application component
│   ├── authProvider.js   # Authentication logic
│   ├── dataProvider.js   # API data provider
│   ├── components/       # Custom components
│   │   ├── Dashboard.jsx
│   │   ├── UserList.jsx
│   │   └── WordImport.jsx
│   └── resources/        # Resource configurations
│       ├── users.js
│       ├── words.js
│       └── languages.js
├── public/               # Static assets
├── package.json
└── vite.config.js
```

## Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000/api/admin
```

## Building for Production

```bash
npm run build
```

Output will be in `dist/` folder. Deploy to:
- Netlify
- Vercel  
- AWS S3 + CloudFront
- Or serve from backend Express static middleware

## Admin User Setup

Before using the admin panel, ensure you have an admin user:

```sql
-- In your PostgreSQL database:
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Available Resources

- **Users** - Full CRUD operations
- **Languages** - View language pairs and statistics
- **Words** - Browse, search, edit vocabulary
- **Statistics** - Platform analytics dashboard

## Development

### Adding New Resources

1. Create resource configuration in `src/resources/`
2. Import and register in `src/App.jsx`
3. Customize fields, filters, and actions as needed

### Custom Components

Add custom components in `src/components/` for specialized functionality like:
- Bulk word import
- User activity charts
- Language statistics
- Custom dashboards

## Documentation

Full setup guide: `/docs/ADMIN_SETUP.md`

## Support

For issues or questions, check the backend API documentation and ensure:
- Backend is running
- Database migration has been applied (role column exists)
- User has admin role
- CORS is configured correctly
