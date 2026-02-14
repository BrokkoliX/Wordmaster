# WordMaster Backend API

RESTful API for WordMaster language learning application.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 12+
- **Authentication**: JWT
- **Password Hashing**: bcrypt
- **Validation**: express-validator

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and configure your database and JWT secrets:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wordmaster
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
```

### 3. Setup Database

Create the database:

```bash
createdb wordmaster
```

Run the schema:

```bash
psql -U postgres -d wordmaster -f src/config/schema.sql
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response**:
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

### User Profile

#### Get Current User
```http
GET /api/users/me
Authorization: Bearer <accessToken>
```

#### Update Profile
```http
PUT /api/users/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "username": "newusername",
  "firstName": "Jane"
}
```

### Progress

#### Sync Progress
```http
POST /api/progress/sync
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "progress": [...],
  "sessions": [...],
  "achievements": [...]
}
```

#### Get Statistics
```http
GET /api/progress/stats
Authorization: Bearer <accessToken>
```

## Testing

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-02-13T...",
  "uptime": 123.456
}
```

## Production Deployment

### Build

```bash
npm run start
```

### Environment Variables

Ensure all production environment variables are set:

- `NODE_ENV=production`
- Secure `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Configure production database credentials
- Set `CORS_ORIGIN` to your frontend URL

## Security Features

- ✅ Helmet.js for security headers
- ✅ CORS protection
- ✅ bcrypt password hashing (12 rounds)
- ✅ JWT authentication
- ✅ Input validation
- ✅ SQL injection protection (parameterized queries)
- ✅ Rate limiting (TODO)

## Database Schema

See `src/config/schema.sql` for complete schema.

**Main Tables**:
- `users` - User accounts
- `user_settings` - User preferences
- `user_word_progress` - Learning progress
- `learning_sessions` - Session history
- `user_achievements` - Unlocked achievements
- `refresh_tokens` - JWT refresh tokens

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": []
  }
}
```

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

MIT
