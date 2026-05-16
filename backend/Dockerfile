FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Shell expansion ke jhanjhat ko khatam kar ke seedha Python se Port read karein
# CMD ["python", "-c", "import os, uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))"]
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]