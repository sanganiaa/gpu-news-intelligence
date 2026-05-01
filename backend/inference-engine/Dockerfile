# Local dev (M1/CPU): uses standard Python base
# For NVIDIA cloud: swap base to nvidia/cuda:12.3.0-runtime-ubuntu22.04
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5003
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5003", "--reload"]
