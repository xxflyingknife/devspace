#!/bin/bash

# 配置 (根据你的环境修改)
DOCKER_USERNAME="your-dockerhub-username" # 或者留空如果你使用本地镜像并且K8s可以直接访问
APP_NAMESPACE="my-app-namespace"
BACKEND_IMAGE_NAME="my-backend"
FRONTEND_IMAGE_NAME="my-frontend"
IMAGE_TAG="latest"

# 如果提供了 Docker 用户名，则构建完整的镜像名称
if [ -n "$DOCKER_USERNAME" ]; then # Escaped $
  FULL_BACKEND_IMAGE_NAME="$DOCKER_USERNAME/$BACKEND_IMAGE_NAME:$IMAGE_TAG"
  FULL_FRONTEND_IMAGE_NAME="$DOCKER_USERNAME/$FRONTEND_IMAGE_NAME:$IMAGE_TAG"
else
  FULL_BACKEND_IMAGE_NAME="$BACKEND_IMAGE_NAME:$IMAGE_TAG"
  FULL_FRONTEND_IMAGE_NAME="$FRONTEND_IMAGE_NAME:$IMAGE_TAG"
fi

echo "Backend image: $FULL_BACKEND_IMAGE_NAME"
echo "Frontend image: $FULL_FRONTEND_IMAGE_NAME"

# 函数：构建镜像
build_image() {
  local context_path=$1
  local image_name=$2
  echo "Building $image_name from $context_path..."
  docker build -t "$image_name" "$context_path"
  if [ $? -ne 0 ]; then
    echo "Error building $image_name. Exiting."
    exit 1
  fi
}

# 函数：推送镜像 (如果需要)
push_image() {
  local image_name=$1
  if [ -n "$DOCKER_USERNAME" ]; then
    echo "Pushing $image_name..."
    docker push "$image_name"
    if [ $? -ne 0 ]; then
      echo "Error pushing $image_name. Exiting."
      exit 1
    fi
  else
    echo "Skipping push for $image_name (no DOCKER_USERNAME set)."
    echo "Ensure your K8s environment can access local images (e.g., using 'eval $(minikube docker-env)' or similar)."
  fi
}

# 步骤1: 构建镜像
echo "--- Building Docker Images ---"
build_image "./backend" "$FULL_BACKEND_IMAGE_NAME"
build_image "./frontend" "$FULL_FRONTEND_IMAGE_NAME"

# 步骤2: 推送镜像 (如果 DOCKER_USERNAME 已设置)
echo "--- Pushing Docker Images (if DOCKER_USERNAME is set) ---"
push_image "$FULL_BACKEND_IMAGE_NAME"
push_image "$FULL_FRONTEND_IMAGE_NAME"

# 步骤3: 应用 K8s 清单
echo "--- Applying Kubernetes Manifests ---"
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/backend-service.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/frontend-service.yaml
# kubectl apply -f kubernetes/ingress.yaml # 取消注释以应用 Ingress

echo "--- Deployment process initiated ---"
echo "Use 'kubectl get pods -n $APP_NAMESPACE -w' to watch pod status."
echo "Use 'minikube service frontend-service --url -n $APP_NAMESPACE' (for Minikube) or check LoadBalancer IP to access the app."
