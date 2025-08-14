#!/bin/bash
set -e

echo "Setting up Azure infrastructure..."

# Variables (update these)
RESOURCE_GROUP="rg-assessment"
LOCATION="eastus"
ACR_NAME="acrassessment2024"
AKS_NAME="aks-assessment"

# Login to Azure
echo "Logging in to Azure..."
az login

# Create resource group
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
echo "Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic

# Create AKS cluster
echo "Creating AKS cluster..."
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --attach-acr $ACR_NAME

# Get AKS credentials
echo "Getting AKS credentials..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME

# Verify connection
echo "Verifying connection..."
kubectl get nodes

echo "Infrastructure setup completed successfully!"