FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

RUN addgroup --system personalos \
    && adduser --system --ingroup personalos personalos \
    && mkdir -p /data \
    && chown personalos:personalos /data

COPY --chown=personalos:personalos app ./app

USER personalos

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

