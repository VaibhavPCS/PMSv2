#!/bin/bash
# Build and push all PMS Docker images
# Usage: ./scripts/build-and-push.sh <registry>
# Example: ./scripts/build-and-push.sh youruser
# Example: ./scripts/build-and-push.sh 192.168.1.226:5000

set -e

REGISTRY=${1:-"youruser"}
TAG=${2:-"latest"}

ROOT=$(cd "$(dirname "$0")/.." && pwd)

services=(
  "auth-service:pms-auth"
  "workspace-service:pms-workspace"
  "project-service:pms-project"
  "task-service:pms-task"
  "notification-service:pms-notification"
  "workflow-engine:pms-workflow"
  "comms-service:pms-comms"
  "file-services:pms-files"
  "meeting-service:pms-meeting"
)

echo "Building from: $ROOT"
echo "Registry: $REGISTRY | Tag: $TAG"
echo "---"

for entry in "${services[@]}"; do
  IFS=: read -r svc img <<< "$entry"
  full_image="$REGISTRY/$img:$TAG"
  echo "Building $full_image ..."
  docker build -f "$ROOT/services/$svc/Dockerfile" -t "$full_image" "$ROOT"
  echo "Pushing $full_image ..."
  docker push "$full_image"
  echo "Done: $full_image"
  echo "---"
done

echo "All images built and pushed successfully."
echo "Update k8s/services.yaml with registry: $REGISTRY"
