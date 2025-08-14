#!/bin/bash
set -e

echo "Setting up monitoring infrastructure..."

# Add Prometheus Helm repository
echo "Adding Prometheus Helm repository..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
echo "Creating monitoring namespace..."
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Install kube-prometheus-stack
echo "Installing kube-prometheus-stack..."
helm upgrade --install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set grafana.adminPassword=admin123 \
  --values monitoring/prometheus-values.yaml \
  --wait \
  --timeout=600s

# Install Blackbox Exporter
echo "Installing Blackbox Exporter..."
helm upgrade --install blackbox-exporter prometheus-community/prometheus-blackbox-exporter \
  --namespace monitoring \
  --values monitoring/blackbox-values.yaml \
  --wait \
  --timeout=300s

# Create ArgoCD namespace and install
echo "Setting up ArgoCD..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
echo "Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=600s deployment/argocd-server -n argocd

echo "Monitoring setup completed successfully!"
echo ""
echo "Access URLs (use kubectl port-forward):"
echo "- Grafana: kubectl port-forward svc/kube-prometheus-grafana 3000:80 -n monitoring"
echo "- Prometheus: kubectl port-forward svc/kube-prometheus-prometheus 9090:9090 -n monitoring"
echo "- ArgoCD: kubectl port-forward svc/argocd-server 8080:443 -n argocd"
echo ""
echo "ArgoCD admin password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo ""