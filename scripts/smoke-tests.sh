#!/bin/bash

# Get service external IP
SERVICE_IP=$(kubectl get svc ip-reverser -n ip-reverser -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$SERVICE_IP" ]; then
  echo "Service IP not found. Using port-forward..."
  kubectl port-forward svc/ip-reverser 8080:80 -n ip-reverser &
  PF_PID=$!
  SERVICE_URL="http://localhost:8080"
  sleep 5
else
  SERVICE_URL="http://$SERVICE_IP"
fi

echo "Testing service at: $SERVICE_URL"

# Health check
echo "Testing health endpoint..."
curl -f "$SERVICE_URL/health" || exit 1

# Main functionality
echo "Testing main endpoint..."
curl -f "$SERVICE_URL/" || exit 1

# Test with specific IP
echo "Testing with X-Forwarded-For header..."
curl -f -H "X-Forwarded-For: 8.8.8.8" "$SERVICE_URL/" || exit 1

echo "All tests passed!"

# Cleanup
if [ ! -z "$PF_PID" ]; then
  kill $PF_PID
fi