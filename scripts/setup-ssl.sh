#!/bin/bash

# SSL/TLS Setup Script for IP Reverser Application
# This script installs NGINX Ingress Controller and cert-manager for SSL certificates

set -e

echo "🔒 Starting SSL/TLS setup for IP Reverser Application..."

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        echo "❌ kubectl is not installed or not in PATH"
        exit 1
    fi
}

# Function to check if helm is available
check_helm() {
    if ! command -v helm &> /dev/null; then
        echo "❌ helm is not installed or not in PATH"
        exit 1
    fi
}

# Function to check if cluster is accessible
check_cluster() {
    if ! kubectl cluster-info &> /dev/null; then
        echo "❌ Cannot connect to Kubernetes cluster"
        exit 1
    fi
    echo "✅ Connected to Kubernetes cluster"
}

# Function to install NGINX Ingress Controller
install_nginx_ingress() {
    echo "📦 Installing NGINX Ingress Controller..."
    
    # Add repository
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    # Create namespace
    kubectl create namespace ingress-nginx --dry-run=client -o yaml | kubectl apply -f -
    
    # Install NGINX Ingress
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --set controller.replicaCount=2 \
        --set controller.nodeSelector."kubernetes\.io/os"=linux \
        --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux \
        --set controller.admissionWebhooks.patch.nodeSelector."kubernetes\.io/os"=linux \
        --set controller.service.type=LoadBalancer \
        --set controller.metrics.enabled=true \
        --set controller.metrics.serviceMonitor.enabled=true \
        --set controller.metrics.serviceMonitor.additionalLabels.release=kube-prometheus \
        --wait \
        --timeout=300s
    
    echo "⏳ Waiting for NGINX Ingress Controller to be ready..."
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    echo "✅ NGINX Ingress Controller installed successfully"
}

# Function to install cert-manager
install_cert_manager() {
    echo "📦 Installing cert-manager..."
    
    # Add repository
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Create namespace
    kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -
    
    # Install cert-manager
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --version v1.13.3 \
        --set installCRDs=true \
        --set prometheus.enabled=true \
        --set webhook.timeoutSeconds=4 \
        --wait \
        --timeout=300s
    
    echo "⏳ Waiting for cert-manager to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-cainjector -n cert-manager
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
    
    echo "✅ cert-manager installed successfully"
}

# Function to create ClusterIssuers
create_cluster_issuers() {
    echo "📜 Creating Let's Encrypt ClusterIssuers..."
    
    # Apply ClusterIssuer configurations
    kubectl apply -f ssl-config/cluster-issuer.yaml
    
    echo "✅ ClusterIssuers created successfully"
}

# Function to get LoadBalancer IP
get_loadbalancer_ip() {
    echo "🌐 Getting LoadBalancer IP address..."
    
    # Wait for LoadBalancer to get external IP
    echo "⏳ Waiting for LoadBalancer to get external IP (this may take a few minutes)..."
    
    for i in {1..60}; do
        EXTERNAL_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        if [ -n "$EXTERNAL_IP" ] && [ "$EXTERNAL_IP" != "null" ]; then
            echo "✅ LoadBalancer External IP: $EXTERNAL_IP"
            echo ""
            echo "📋 Next steps:"
            echo "1. Update your DNS to point your domain to: $EXTERNAL_IP"
            echo "2. Update the domain in helm/ip-reverser/values.yaml if needed"
            echo "3. Deploy your application with: helm upgrade --install ip-reverser helm/ip-reverser -n ip-reverser"
            break
        fi
        echo "   Waiting for external IP... (attempt $i/60)"
        sleep 10
    done
    
    if [ -z "$EXTERNAL_IP" ] || [ "$EXTERNAL_IP" == "null" ]; then
        echo "⚠️  LoadBalancer IP not assigned yet. Check with:"
        echo "   kubectl get svc -n ingress-nginx ingress-nginx-controller"
    fi
}

# Function to validate SSL setup
validate_ssl_setup() {
    echo "🔍 Validating SSL setup..."
    
    # Check NGINX Ingress
    if kubectl get deployment -n ingress-nginx ingress-nginx-controller &> /dev/null; then
        echo "✅ NGINX Ingress Controller is deployed"
    else
        echo "❌ NGINX Ingress Controller is not deployed"
        return 1
    fi
    
    # Check cert-manager
    if kubectl get deployment -n cert-manager cert-manager &> /dev/null; then
        echo "✅ cert-manager is deployed"
    else
        echo "❌ cert-manager is not deployed"
        return 1
    fi
    
    # Check ClusterIssuers
    if kubectl get clusterissuer letsencrypt-prod &> /dev/null; then
        echo "✅ Let's Encrypt production ClusterIssuer is created"
    else
        echo "❌ Let's Encrypt production ClusterIssuer is missing"
        return 1
    fi
    
    if kubectl get clusterissuer letsencrypt-staging &> /dev/null; then
        echo "✅ Let's Encrypt staging ClusterIssuer is created"
    else
        echo "❌ Let's Encrypt staging ClusterIssuer is missing"
        return 1
    fi
    
    echo "✅ SSL setup validation completed successfully"
}

# Main execution
main() {
    echo "🚀 IP Reverser SSL/TLS Setup Script"
    echo "=================================="
    
    # Perform checks
    check_kubectl
    check_helm
    check_cluster
    
    # Install components
    install_nginx_ingress
    install_cert_manager
    create_cluster_issuers
    
    # Get LoadBalancer info
    get_loadbalancer_ip
    
    # Validate setup
    validate_ssl_setup
    
    echo ""
    echo "🎉 SSL/TLS setup completed successfully!"
    echo ""
    echo "📝 Important notes:"
    echo "   • Make sure your domain DNS points to the LoadBalancer IP"
    echo "   • Update the email address in ssl-config/cluster-issuer.yaml"
    echo "   • For testing, use letsencrypt-staging first, then switch to letsencrypt-prod"
    echo "   • SSL certificates will be automatically issued when you deploy the application"
    echo ""
}

# Run main function
main "$@"