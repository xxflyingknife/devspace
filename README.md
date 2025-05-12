# My Fullstack K8s App

这是一个简单的全栈应用程序，前端使用 React，后端使用 Python (Flask)，数据库使用 SQLite。
所有服务都容器化并通过 Kubernetes 部署。

## 目录结构

- `frontend/`: React 前端应用代码和 Dockerfile。
- `backend/`: Python Flask 后端应用代码和 Dockerfile。
- `kubernetes/`: Kubernetes 部署和服务 YAML 清单。
- `deploy.sh`: (可选) 用于构建镜像、推送镜像（如果需要）和应用 K8s 清单的脚本。

## 先决条件

- Docker 已安装并运行。
- Kubernetes 集群已配置 (例如 Minikube, Kind, Docker Desktop K8s, 或云提供商的 K8s)。
- `kubectl` 已安装并配置为指向您的集群。
- (可选) 一个 Docker 镜像仓库 (如 Docker Hub) 来推送镜像，如果你的 K8s 集群无法直接访问本地 Docker 守护进程的镜像。

## 部署步骤

1.  **设置镜像名称 (重要!)**:
    打开 `kubernetes/backend-deployment.yaml` 和 `kubernetes/frontend-deployment.yaml`，
    将 `image: your-dockerhub-username/my-backend:latest` 和 `image: your-dockerhub-username/my-frontend:latest`
    替换为你的实际 Docker Hub 用户名或你使用的其他镜像仓库地址。
    如果你在本地 K8s (如 Minikube) 中测试，并且可以直接使用本地构建的镜像，可以简化镜像名称为 `my-backend:latest` 和 `my-frontend:latest`，并确保 Minikube 的 Docker 环境与本地一致 (例如，通过 `eval $(minikube -p minikube docker-env)`)。

2.  **构建 Docker 镜像**:
    ```bash
    # 进入 backend 目录构建后端镜像
    cd backend
    docker build -t your-dockerhub-username/my-backend:latest .
    cd ..

    # 进入 frontend 目录构建前端镜像
    cd frontend
    docker build -t your-dockerhub-username/my-frontend:latest .
    cd ..
    ```

3.  **(可选) 推送镜像到仓库**:
    如果你的 K8s 集群不能直接访问本地构建的镜像，你需要推送到一个镜像仓库。
    ```bash
    docker push your-dockerhub-username/my-backend:latest
    docker push your-dockerhub-username/my-frontend:latest
    ```

4.  **应用 Kubernetes 清单**:
    ```bash
    # 创建命名空间 (可选，但推荐)
    kubectl apply -f kubernetes/namespace.yaml

    # 部署后端
    kubectl apply -f kubernetes/backend-deployment.yaml
    kubectl apply -f kubernetes/backend-service.yaml

    # 部署前端
    kubectl apply -f kubernetes/frontend-deployment.yaml
    kubectl apply -f kubernetes/frontend-service.yaml

    # (可选) 如果你配置了 Ingress 控制器并想使用 Ingress
    # kubectl apply -f kubernetes/ingress.yaml
    ```
    或者，如果 `deploy.sh` 脚本已配置好，可以直接运行：
    ```bash
    # chmod +x deploy.sh
    # ./deploy.sh
    ```

5.  **检查部署状态**:
    ```bash
    kubectl get pods -n my-app-namespace
    kubectl get services -n my-app-namespace
    ```
    等待 Pods 变为 `Running` 状态。

6.  **访问应用**:
    如果 `frontend-service` 的类型是 `LoadBalancer`，并且你的 K8s 环境支持它，你可以通过外部 IP 访问：
    ```bash
    kubectl get svc frontend-service -n my-app-namespace -o jsonpath="{.status.loadBalancer.ingress[0].ip}"
    ```
    如果类型是 `NodePort`，或者你在 Minikube 中：
    ```bash
    minikube service frontend-service --url -n my-app-namespace
    ```
    然后在浏览器中打开返回的 URL。

## 开发

### 前端

```bash
cd frontend
npm install
npm start # 启动开发服务器
```

### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate # 或者 venv\Scripts\activate on Windows
pip install -r requirements.txt
flask run --host=0.0.0.0 # 或者 python -m app.main
```
