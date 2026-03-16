# ABC Books - Neon Database Backend

Backend API for ABC Books using **Neon PostgreSQL** (serverless database).

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- A Neon account (free at [neon.tech](https://neon.tech))

### Step 1: Get Your Neon Database

1. Go to **https://neon.tech** and sign up (free)
2. Create a new project called **"abc-books"**
3. Copy your **connection string** from the dashboard
   - It looks like: `postgresql://username:password@ep-xxx.region.neon.tech/neondb?sslmode=require`

### Step 2: Setup Environment

1. Create `.env` file in the `backend` folder:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Neon connection string:
```env
DATABASE_URL=your-neon-connection-string-here
JWT_SECRET=your-random-secret-key-here
PORT=3001
```

### Step 3: Install Dependencies

```bash
cd backend
npm install
```

### Step 4: Create Database Tables

```bash
npm run setup-db
```

This will create all required tables:
- users
- books
- book_sections
- cart
- wishlist
- orders
- order_items
- categories

### Step 5: Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The API will be running at **http://localhost:3001**

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Books
- `GET /api/books` - Get all books (with search & category filters)
- `GET /api/books/:id` - Get book by ID
- `GET /api/books/section/:section` - Get books by section (hero, featured, etc.)
- `POST /api/books` - Add new book (admin)
- `PUT /api/books/:id` - Update book (admin)
- `DELETE /api/books/:id` - Delete book (admin)

### Cart
- `GET /api/cart/:userId` - Get user's cart
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update cart item quantity
- `DELETE /api/cart/:id` - Remove from cart
- `DELETE /api/cart/clear/:userId` - Clear entire cart

### Wishlist
- `GET /api/wishlist/:userId` - Get user's wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/:id` - Remove from wishlist
- `GET /api/wishlist/check/:userId/:bookId` - Check if book is in wishlist

### Orders
- `GET /api/orders` - Get all orders (admin)
- `GET /api/orders/my-orders` - Get user's orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status (admin)
- `DELETE /api/orders/:id` - Delete order (admin)

### Users (Admin)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user with order history
- `DELETE /api/users/:id` - Delete user

---

## 🗄️ Database Schema

### users
```sql
id, name, email, phone, password_hash, created_at, updated_at
```

### books
```sql
id, title, author, price, original_price, image, description, 
category, isbn, publish_year, rating, created_at, updated_at
```

### orders
```sql
id, order_id, user_id, subtotal, discount, total,
shipping_*, payment_method, status, created_at, updated_at
```

### cart
```sql
id, user_id, book_id, quantity, created_at
```

### wishlist
```sql
id, user_id, book_id, created_at
```

---

## 🔐 Security Features

- ✅ Passwords hashed with bcrypt
- ✅ JWT authentication tokens
- ✅ SQL injection protection (parameterized queries)
- ✅ CORS enabled for frontend

---

## 📝 Example Requests

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "securepassword"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### Get Books
```bash
curl http://localhost:3001/api/books
```

### Search Books
```bash
curl "http://localhost:3001/api/books?search=quran"
```

---

## 🛠️ Development

### Project Structure
```
backend/
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── books.js         # Books CRUD
│   ├── cart.js          # Shopping cart
│   ├── wishlist.js      # Wishlist
│   ├── orders.js        # Orders management
│   └── users.js         # User management
├── server.js            # Main server file
├── setup-database.js    # Database setup script
├── package.json
├── .env.example
└── README.md
```

### Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3001)

---

## 🚨 Troubleshooting

### "Cannot connect to database"
- Check your `DATABASE_URL` in `.env`
- Make sure your Neon project is active
- Verify your IP is allowed (Neon allows all IPs by default)

### "Table does not exist"
- Run `npm run setup-db` to create tables

### "Port already in use"
- Change `PORT` in `.env` to a different port

---

## 📦 Next Steps

After backend is running:
1. Update frontend to use API instead of localStorage
2. Add authentication tokens to frontend requests
3. Test all features end-to-end

---

## 🎯 Production Deployment

For production, deploy to:
- **Backend**: Vercel, Railway, Render, or Heroku
- **Database**: Already on Neon (production-ready)
- **Frontend**: Vercel, Netlify, or GitHub Pages

---

**Need help?** Check the Neon docs: https://neon.tech/docs
