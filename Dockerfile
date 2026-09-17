FROM golang:1.25-alpine AS builder

ENV GOTOOLCHAIN=auto CGO_ENABLED=0 GOOS=linux

WORKDIR /app

# Copy backend dependency files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ ./

# Gate kualitas dijalankan di dalam build agar image tidak pernah dibuat dari
# kode yang gagal vet atau test.
RUN go vet ./... && go test ./...

# -trimpath menghapus jalur build dari binary, -s -w memangkas simbol debug.
RUN go build -trimpath -ldflags="-s -w" -o main .

FROM alpine:3.22
RUN apk --no-cache add ca-certificates tzdata wget

RUN addgroup -S -g 10001 tripkita && adduser -S -D -H -u 10001 -G tripkita tripkita
WORKDIR /app
RUN mkdir -p /app/uploads && chown -R tripkita:tripkita /app
COPY --from=builder --chown=tripkita:tripkita /app/main ./main

USER tripkita

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["./main"]
