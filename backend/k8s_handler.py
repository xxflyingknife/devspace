from kubernetes import client, config, watch
from config import K8S_APP_CONFIG
import time

# --- Load K8s Config ---
try:
    # Try loading default config (from ~/.kube/config or KUBECONFIG env var)
    config.load_kube_config()
    print("Kubernetes config loaded successfully from default location.")
except config.ConfigException:
    try:
        # If that fails, try in-cluster config (for running inside K8s)
        config.load_incluster_config()
        print("Kubernetes config loaded successfully from in-cluster service account.")
    except config.ConfigException:
        print("Error: Could not configure Kubernetes client. Ensure kubeconfig is valid or running in-cluster.")
        # Set API clients to None or raise an exception to prevent use
        CORE_V1_API = None
        APPS_V1_API = None
        # Depending on requirements, you might want the app to exit if K8s config fails.
# --- Initialize API Clients ---
if config: # Check if config loading was attempted/successful
    try:
        CORE_V1_API = client.CoreV1Api()
        APPS_V1_API = client.AppsV1Api()
        print("Kubernetes API clients initialized.")
    except Exception as e:
        print(f"Error initializing Kubernetes API clients: {e}")
        CORE_V1_API = None
        APPS_V1_API = None


def get_k8s_status(app_id: str) -> dict:
    """
    Fetches the status of Deployments, Pods, and Services related to the app_id.
    Uses label selectors defined in config.py.
    """
    print(f"Attempting to get K8s status for app_id: {app_id}")
    if not CORE_V1_API or not APPS_V1_API:
        return {"error": "Kubernetes client not initialized."}

    app_conf = K8S_APP_CONFIG.get(app_id)
    if not app_conf:
        return {"error": f"Configuration not found for app_id: {app_id}"}

    namespace = app_conf.get("namespace", "default")
    label_selector = app_conf.get("label_selector", "") # Use empty string if not defined
    print(f"Using namespace='{namespace}', label_selector='{label_selector}'")

    results = {
        "deployments": [],
        "pods": [],
        "services": [],
        "error": None
    }
    start_time = time.time()

    try:
        # Get Deployments
        print(f"Fetching deployments...")
        api_response_dep = APPS_V1_API.list_namespaced_deployment(namespace, label_selector=label_selector, timeout_seconds=10)
        for dep in api_response_dep.items:
            status = dep.status
            results["deployments"].append({
                "name": dep.metadata.name,
                "replicas": dep.spec.replicas or 0,
                "readyReplicas": status.ready_replicas or 0,
                "availableReplicas": status.available_replicas or 0,
                "updatedReplicas": status.updated_replicas or 0,
                "status": "Running" if (status.ready_replicas or 0) == (dep.spec.replicas or 0) and (status.ready_replicas or 0) > 0 else "Updating/Pending", # Simplified status
                "conditions": [cond.type + "=" + cond.status for cond in status.conditions] if status.conditions else []
            })
        print(f"Found {len(results['deployments'])} deployments.")

        # Get Pods
        print(f"Fetching pods...")
        api_response_pod = CORE_V1_API.list_namespaced_pod(namespace, label_selector=label_selector, timeout_seconds=10)
        for pod in api_response_pod.items:
            ready_containers = 0
            total_containers = len(pod.spec.containers)
            restarts = 0
            if pod.status.container_statuses:
                for cs in pod.status.container_statuses:
                    if cs.ready:
                        ready_containers += 1
                    restarts += cs.restart_count # Sum restarts across containers

            results["pods"].append({
                "name": pod.metadata.name,
                "ready": f"{ready_containers}/{total_containers}",
                "status": pod.status.phase, # e.g., Pending, Running, Succeeded, Failed, Unknown
                "restarts": restarts,
                "nodeName": pod.spec.node_name,
                "podIP": pod.status.pod_ip,
            })
        print(f"Found {len(results['pods'])} pods.")


        # Get Services
        print(f"Fetching services...")
        api_response_svc = CORE_V1_API.list_namespaced_service(namespace, label_selector=label_selector, timeout_seconds=10)
        for svc in api_response_svc.items:
            external_ip = "<none>"
            if svc.spec.type == "LoadBalancer" and svc.status.load_balancer.ingress:
                 # Use hostname if available, else IP
                 ingress = svc.status.load_balancer.ingress[0]
                 external_ip = ingress.hostname or ingress.ip or "<pending>"
            elif svc.spec.external_i_ps: # Handle ExternalName, etc. if needed
                 external_ip = ",".join(svc.spec.external_i_ps)


            results["services"].append({
                "name": svc.metadata.name,
                "type": svc.spec.type,
                "clusterIP": svc.spec.cluster_ip or "<none>",
                "externalIP": external_ip,
                "ports": ", ".join([f"{p.port}/{p.protocol}" + (f"->{p.node_port}" if p.node_port else "") for p in svc.spec.ports]) if svc.spec.ports else "<none>"
            })
        print(f"Found {len(results['services'])} services.")

    except client.ApiException as e:
        print(f"Kubernetes API Error fetching status for app '{app_id}': {e.reason} (Status: {e.status})")
        results["error"] = f"Kubernetes API Error: {e.reason}"
    except Exception as e:
        print(f"Unexpected error fetching K8s status for app '{app_id}': {e}")
        results["error"] = "An unexpected error occurred while fetching Kubernetes status."

    end_time = time.time()
    print(f"K8s status fetch for '{app_id}' took {end_time - start_time:.2f} seconds.")
    return results

