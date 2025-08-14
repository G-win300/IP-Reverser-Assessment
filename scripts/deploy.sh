#!/bin/bash
set -e

echo "Starting IP Reverser deployment..."

# Create namespace
kubectl create namespace ip-reverser --dry-run=client -o yaml | kubectl apply -f -

# Deploy PostgreSQL and application using Helm
helm upgrade --install ip-reverser ./helm/ip-reverser \
  --namespace ip-reverser \
  --values ./helm/ip-reverser/values.yaml \
  --wait \
  --timeout=600s

# Apply ArgoCD application
kubectl apply -f argocd/application.yaml

# Apply monitoring rules
kubectl apply -f monitoring/alert-rules.yaml

# Wait for deployment to be ready
kubectl wait --for=condition=available --timeout=600s deployment/ip-reverser -n ip-reverser

echo "Deployment completed successfully!"

# Get service URL
kubectl get svc ip-reverser -n ip-reverser -o jsonpath='{.status.loadBalancer.ingress[0].ip}'