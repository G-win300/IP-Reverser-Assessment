# IP Reverser Application

A Node.js web application that extracts client IP addresses from HTTP requests, reverses them (e.g., 1.2.3.4 → 4.3.2.1), and stores them in a PostgreSQL database. This project demonstrates a complete DevOps pipeline using Azure Kubernetes Service (AKS), Azure Pipelines, ArgoCD, and comprehensive monitoring.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker
- Azure CLI
- kubectl
- helm

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Update .env with your database configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

### Docker

1. **Build image:**
   ```bash
   npm run docker:build
   ```

2. **Run container:**
   ```bash
   npm run docker:run
   ```

## Deployment

### Infrastructure Setup

1. **Set up Azure infrastructure:**
   ```bash
   ./scripts/setup-infrastructure.sh
   ```

2. **Set up monitoring:**
   ```bash
   ./scripts/setup-monitoring.sh
   ```

### Application Deployment

```bash
./scripts/deploy.sh
```

### Smoke Tests

```bash
./scripts/smoke-tests.sh
```

## API Endpoints

- `GET /` - Main endpoint that reverses client IP
- `GET /health` - Health check endpoint
- `GET /ips` - List all stored IP records

## Architecture

- **Application**: Node.js with Express.js
- **Database**: PostgreSQL
- **Container Registry**: Azure Container Registry
- **Orchestration**: Azure Kubernetes Service (AKS)
- **CI/CD**: Azure Pipelines
- **GitOps**: ArgoCD
- **Monitoring**: kube-prometheus-stack + Blackbox Exporter

## Monitoring

Access monitoring dashboards:
- **Grafana**: `kubectl port-forward svc/kube-prometheus-grafana 3000:80 -n monitoring`
- **Prometheus**: `kubectl port-forward svc/kube-prometheus-prometheus 9090:9090 -n monitoring`
- **ArgoCD**: `kubectl port-forward svc/argocd-server 8080:443 -n argocd`

## Project Structure

```
├── src/
│   ├── app.js                 # Main application
│   └── services/
│       ├── database.js        # Database service
│       └── ipService.js       # IP handling logic
├── helm/
│   └── ip-reverser/          # Helm chart
├── argocd/
│   └── application.yaml      # ArgoCD configuration
├── monitoring/               # Monitoring configurations
├── scripts/                  # Deployment scripts
├── tests/                    # Test files
├── Dockerfile               # Container configuration
└── azure-pipelines.yml     # CI/CD pipeline
```