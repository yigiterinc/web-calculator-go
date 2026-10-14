FROM node:24.21.0-alpine3.23 AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

FROM golang:1.27.2-alpine3.23 AS backend
WORKDIR /build
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

FROM scratch
COPY --from=backend /server /server
COPY --from=frontend /build/dist /web
USER 65532:65532
ENV PORT=8080 STATIC_DIR=/web
EXPOSE 8080
ENTRYPOINT ["/server"]
