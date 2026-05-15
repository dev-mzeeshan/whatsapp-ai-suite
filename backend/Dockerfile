FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Shell form use karein, is se $PORT sahi se expand hoga
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}