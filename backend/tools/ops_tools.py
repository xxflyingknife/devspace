# devspace/backend/tools/ops_tools.py
from langchain_core.tools import tool
import json

from services.k8s_service import K8sService
# from services.space_service import SpaceService # If ops tools need space-specific K8s contexts
# from plugins.skill_manager import skill_manager # If AIOps skills are centrally managed

k8s_service_instance = K8sService()
# space_service_instance = SpaceService()

@tool
def k8s_get_pod_logs(namespace: str, pod_name: str, container_name: str = None, tail_lines: int = 100, k8s_context_name: str = None) -> str:
    """
    Fetches logs for a specific 'pod_name' in a given 'namespace'.
    Optionally, specify a 'container_name' and 'tail_lines'.
    'k8s_context_name' can specify which Kubernetes cluster context to use if multiple are configured.
    Returns logs as a string or an error message.
    """
    if not namespace or not pod_name:
        return "Error: 'namespace' and 'pod_name' are required."
    print(f"TOOL: k8s_get_pod_logs: pod='{pod_name}', ns='{namespace}', context='{k8s_context_name}'")
    # result = k8s_service_instance.get_pod_logs(namespace, pod_name, container_name, tail_lines, k8s_context_name)
    # if result.get("success"): return result.get("logs")
    # return f"Error getting logs: {result.get('error')}"
    return f"Mock Logs for {pod_name} in {namespace} (context: {k8s_context_name}):\nOPS Log line 1...\nOPS Log line 2..."

@tool
def k8s_restart_deployment(namespace: str, deployment_name: str, k8s_context_name: str = None) -> str:
    """
    Performs a rolling restart of the 'deployment_name' in a 'namespace'.
    'k8s_context_name' can specify which Kubernetes cluster context to use.
    Returns a confirmation message or an error.
    """
    if not namespace or not deployment_name:
        return "Error: 'namespace' and 'deployment_name' are required."
    print(f"TOOL: k8s_restart_deployment: deploy='{deployment_name}', ns='{namespace}', context='{k8s_context_name}'")
    # result = k8s_service_instance.restart_deployment(namespace, deployment_name, k8s_context_name)
    # if result.get("success"): return result.get("message")
    # return f"Error restarting: {result.get('error')}"
    return f"Mock Success: OPS Deployment '{deployment_name}' in '{namespace}' restart initiated."

@tool
def k8s_scale_deployment(namespace: str, deployment_name: str, replicas: int, k8s_context_name: str = None) -> str:
    """
    Scales a Kubernetes 'deployment_name' to 'replicas' in a 'namespace'.
    'k8s_context_name' can specify which Kubernetes cluster context to use.
    Returns a confirmation or error message.
    """
    if not namespace or not deployment_name: return "Error: 'namespace' and 'deployment_name' are required."
    if not isinstance(replicas, int) or replicas < 0: return "Error: 'replicas' must be a non-negative integer."
    print(f"TOOL: k8s_scale_deployment: deploy='{deployment_name}', ns='{namespace}', replicas={replicas}, context='{k8s_context_name}'")
    # result = k8s_service_instance.scale_deployment(namespace, deployment_name, replicas, k8s_context_name)
    # if result.get("success"): return result.get("message")
    # return f"Error scaling: {result.get('error')}"
    return f"Mock Success: OPS Deployment '{deployment_name}' in '{namespace}' scaling to {replicas} initiated."

@tool
def k8s_list_general_resources(resource_type: str, namespace: str = None, k8s_context_name: str = None, label_selector: str = None) -> str:
    """
    Lists general Kubernetes resources like 'nodes', 'namespaces', 'persistentvolumes (pv)', 'storageclasses'.
    For namespaced resources like 'configmaps', 'secrets', 'ingresses', 'networkpolicies', 'serviceaccounts', 'roles', 'rolebindings', 'customresourcedefinitions (crd)',
    'namespace' must be provided or will default to 'default'.
    'k8s_context_name' specifies the cluster. 'label_selector' can filter resources.
    Returns a JSON string of resources or an error message.
    """
    if not resource_type: return "Error: 'resource_type' is required."
    # Some resource types are not namespaced, e.g., nodes, namespaces, pv, storageclasses
    is_namespaced = resource_type.lower() not in ["nodes", "namespaces", "persistentvolumes", "pv", "storageclasses", "customresourcedefinitions", "crd"]
    
    effective_namespace = namespace
    if is_namespaced and not namespace:
        effective_namespace = "default" # Default for namespaced resources if not provided
    
    print(f"TOOL: k8s_list_general_resources: type='{resource_type}', ns='{effective_namespace}', context='{k8s_context_name}', labels='{label_selector}'")
    # result = k8s_service_instance.list_general_resources(resource_type, effective_namespace, k8s_context_name, label_selector)
    # if result.get("success"): return json.dumps(result.get("resources",[]))
    # return f"Error listing K8s {resource_type}: {result.get('error')}"
    mock_items = []
    if resource_type == "nodes": mock_items = [{"name": "node-1", "status": "Ready"}, {"name": "node-2", "status": "Ready"}]
    elif resource_type == "configmaps" and effective_namespace: mock_items = [{"name": "my-config", "namespace": effective_namespace}]
    return json.dumps({"resources": mock_items}) if mock_items else f"No {resource_type} found (mock)."


@tool
def trigger_aiops_skill(skill_id: str, skill_parameters_json: str, space_id: str = None) -> str:
    """
    Triggers a registered AIOps skill (e.g., 'anomaly_detection', 'root_cause_analysis')
    with the given parameters (as a JSON string).
    'space_id' may provide context for skill execution or configuration.
    Returns a job ID or result summary.
    """
    if not skill_id or not skill_parameters_json:
        return "Error: skill_id and skill_parameters_json are required."
    try:
        params = json.loads(skill_parameters_json)
    except json.JSONDecodeError:
        return "Error: skill_parameters_json is not valid JSON."
    
    print(f"TOOL: trigger_aiops_skill: skill='{skill_id}', params='{params}', space_id='{space_id}'")
    # result = skill_manager.execute_skill(skill_id, params, space_id)
    # return json.dumps(result)
    return f"Mock Success: AIOps skill '{skill_id}' triggered with params {params}. Job ID: aiops-job-456"

# TODO: Add tools for managing Scheduled Tasks from SRE plans if needed.

def get_all_ops_tools():
    return [
        k8s_get_pod_logs,
        k8s_restart_deployment,
        k8s_scale_deployment,
        k8s_list_general_resources,
        trigger_aiops_skill,
    ]

