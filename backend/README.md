# RevPilot Backend API

Backend server for RevPilot sales and invoice tracking app with MongoDB.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/revpilot
NODE_ENV=development
API_BASE_URL=http://localhost:3000/api
```

3. Start MongoDB (if running locally):
```bash
mongod
```

Or use MongoDB Atlas (cloud) and update `MONGODB_URI` in `.env`.

4. Run the server:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Check if server is running

### Products (MongoDB CRUD)

Products are stored in MongoDB. All responses use MongoDB `_id` as the product id.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products (sorted by name) |
| GET | `/api/products/:id` | Get one product by MongoDB `_id` |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |
| POST | `/api/products/sync` | Bulk sync products (for app sync) |

**Create product** – `POST /api/products`  
Body (JSON):
```json
{
  "name": "Product Name",
  "costPrice": 100,
  "sellingPrice": 150,
  "quantity": 50,
  "lowStockLevel": 5
}
```
All fields except `lowStockLevel` are required; `lowStockLevel` defaults to 5.

**Update product** – `PUT /api/products/:id`  
Body: same fields as create; only send fields you want to change.

**Delete product** – `DELETE /api/products/:id`  
Returns `{ "message": "Product deleted" }`.

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create an invoice
- `DELETE /api/invoices/:id` - Delete an invoice
- `POST /api/invoices/sync` - Bulk sync invoices

### Sync
- `GET /api/sync/all` - Get all data (products + invoices)
- `POST /api/sync/push` - Push local data to server

## Deployment

### Heroku
1. Create Heroku app
2. Add MongoDB Atlas addon
3. Set environment variables
4. Deploy: `git push heroku main`

### Vercel/Netlify
1. Set up MongoDB Atlas
2. Configure environment variables
3. Deploy

## Environment Variables

- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment (development/production)
