FROM golang:1.25-alpine AS builder

ENV GOTOOLCHAIN=auto

WORKDIR /app

# Copy backend dependency files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:3.22
RUN apk --no-cache add ca-certificates tzdata

RUN addgroup -S -g 10001 tripkita && adduser -S -D -H -u 10001 -G tripkita tripkita
WORKDIR /app
RUN mkdir -p /app/uploads && chown -R tripkita:tripkita /app
COPY --from=builder --chown=tripkita:tripkita /app/main ./main

USER tripkita

EXPOSE 8080
CMD ["./main"]
