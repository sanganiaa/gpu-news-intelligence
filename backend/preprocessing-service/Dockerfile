FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm
COPY . .
EXPOSE 5002
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5002", "--reload"]
