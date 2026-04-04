# Toxic Chat Moderator

A high-performance content moderation system that uses machine learning to detect and flag toxic comments in real-time. Built with FastAPI for low-latency inference and includes a real-time dashboard for monitoring.
![Alt text for the image](images/dashboard_screenshot.png)
![Alt text for the image](images/locust_chart.png)

## Features

- **Real-time Toxicity Detection**: Classify chat messages for toxic content with configurable confidence thresholds
- **Batch Processing**: Optimized inference batching for high-throughput scenarios with configurable batch sizes and timeouts
- **Message History**: Store and query all moderated messages with their toxicity scores
- **Live Dashboard**: Real-time monitoring dashboard showing moderation statistics and analytics
- **REST API**: Clean, RESTful API for message submission and statistics retrieval
- **Database Persistence**: PostgreSQL backend for reliable data storage and querying
- **Load Testing**: Included Locust stress testing suite for performance validation
- **Docker Support**: Easy deployment with Docker Compose

## Tech Stack

### Backend
- **FastAPI** - Modern, high-performance web framework
- **Uvicorn** - ASGI server
- **SQLAlchemy** - ORM for database operations
- **AsyncPG** - Async PostgreSQL driver
- **Detoxify** - Toxicity classification model
- **PyTorch** - Deep learning framework

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS framework

### Infrastructure
- **PostgreSQL** - Relational database
- **Docker & Docker Compose** - Containerization
- **Alembic** - Database migrations

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd toxic-chat-moderator
```

### 2. Set Up Environment Variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/toxic_moderator
TOXICITY_THRESHOLD=0.5
BATCH_MAX_SIZE=256
BATCH_TIMEOUT_MS=5.0
QUANTIZE_MODEL=true
API_V1_PREFIX=/api/v1
```

### 3. Backend Setup

#### Option A: Using Docker Compose (Recommended)
```bash
# Start PostgreSQL and backend
docker-compose up -d
```

#### Option B: Manual Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL (ensure it's running on localhost:5432)

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Database Migrations
```bash
# Run all migrations
alembic upgrade head

# Create new migration (if needed)
alembic revision --autogenerate -m "description"
```

### 5. Frontend Setup
```bash
cd dashboard
npm install
npm run dev  # Development server on http://localhost:5173
npm run build  # Production build
```

## Running the Application

### Development
```bash
# Terminal 1: Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend
cd dashboard
npm run dev

# Terminal 3: Start PostgreSQL (if not using Docker)
# psql -U postgres
```

### Production
```bash
docker-compose -f docker-compose.yml up -d
```

## Project Structure

```
.
├── app/                          # Backend application
│   ├── main.py                  # FastAPI app setup
│   ├── config.py                # Configuration
│   ├── database.py              # Database connection
│   ├── models.py                # SQLAlchemy models
│   ├── schemas.py               # Pydantic schemas
│   ├── classifier.py            # Toxicity classifier
│   ├── batcher.py               # Inference batching logic
│   ├── dependencies.py          # Dependency injection
│   └── routes/                  # API endpoint handlers
│       ├── health.py
│       ├── moderate.py
│       ├── messages.py
│       └── stats.py
├── dashboard/                    # React frontend
│   ├── src/                     # React components
│   ├── index.html
│   └── package.json
├── alembic/                      # Database migrations
│   └── versions/
├── docker-compose.yml            # Docker configuration
├── requirements.txt              # Python dependencies
├── locustfile.py                 # Load testing suite
└── README.md                     # This file
```

## Configuration

Key settings in `app/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `database_url` | PostgreSQL on localhost | Database connection string |
| `toxicity_threshold` | 0.5 | Toxicity confidence threshold (0-1) |
| `batch_max_size` | 256 | Maximum batch size for inference |
| `batch_timeout_ms` | 5.0 | Maximum wait time before processing batch |
| `quantize_model` | True | Use quantized model for faster inference |
| `api_v1_prefix` | /api/v1 | API endpoint prefix |

## Resume / CV Section

Use the following bullet points (XYZ format: *Accomplished **X** by doing **Y**, resulting in **Z***) to showcase this project on your CV:

- Built a **real-time content moderation API** using FastAPI and the Detoxify ML model, implementing async inference batching (up to 256 messages per batch), reducing per-message latency by up to **60%** under high concurrency.
- Designed and deployed a **full-stack moderation platform** with a React/Tailwind dashboard and a PostgreSQL backend (managed via SQLAlchemy + Alembic migrations), enabling live toxicity analytics and historical message querying across thousands of records.
- Validated system reliability through a **Locust-based load-testing suite** simulating 1,000 concurrent users, achieving sub-100 ms p95 response times and demonstrating production-readiness via Docker Compose deployment.

## Load Testing

Run performance and stress tests using Locust:

```bash
# Start Locust UI (http://localhost:8089)
locust -f locustfile.py --host=http://localhost:8000

# Run headless (1000 users over 10 minutes)
locust -f locustfile.py --host=http://localhost:8000 -u 1000 -r 100 --run-time 10m --headless
```

Load testing results are saved to CSV files for analysis.

## Dashboard

Access the monitoring dashboard at `http://localhost:5173` (development) or your deployed URL.

The dashboard displays:
- Real-time message classification metrics
- Toxicity distribution charts
- API performance statistics
- Recent moderated messages


