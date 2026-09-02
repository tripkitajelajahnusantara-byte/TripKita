FROM golang:1.24-alpine AS builder

ENV GOTOOLCHAIN=auto

WORKDIR /app

# Copy backend dependency files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/
COPY --from=builder /app/main .

EXPOSE 8080
CMD ["./main"]
