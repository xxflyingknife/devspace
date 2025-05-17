# devspace/backend/services/k8s_service.py
from kubernetes import client, config as k8s_config_loader
import yaml # For parsing YAML strings
import json # For parsing k8s_environments_json

class K8sService:
    def __init__(self):
        self.active_clients = {} # Cache clients: {"context_name": {"core_v1": ..., "apps_v1": ...}}
        print("K8sService initialized.")

    def _get_k8s_api_clients(self, space_id: str, environment_key: str = 'test'):
        """
        Loads K8s config for a specific environment of a space and returns API clients.
        'environment_key' could be 'test', 'grayscale', 'production'.
        """
        # TODO: Fetch DevSpaceConfig for space_id
        # from services.space_service import space_service_instance
        # dev_config_model = space_service_instance.get_dev_config_object(space_id)
        # if not dev_config_model or not dev_config_model.k8s_environments_json:
        #     raise ValueError(f"K8s environment config not found for space {space_id}")
        # envs = json.loads(dev_config_model.k8s_environments_json)
        # target_env_config = envs.get(environment_key)
        # if not target_env_config or not target_env_config.get("context"): # Assuming context is stored
        #     raise ValueError(f"K8s config for environment '{environment_key}' not found in space {space_id}")
        # context_name = target_env_config["context"]
        
        # For MOCKING, let's assume a context name can be derived or is fixed for testing
        context_name = f"mock_context_for_space_{space_id}_env_{environment_key}" # Placeholder
        
        if context_name in self.active_clients:
            return self.active_clients[context_name]

        try:
            print(f"SERVICE-K8S: Loading K8s config for context: {context_name}")
            # k8s_config_loader.load_kube_config(context=context_name) # Use specific context
            k8s_config_loader.load_kube_config() # For now, use default context for simplicity
            
            clients = {
                "core_v1": client.CoreV1Api(),
                "apps_v1": client.AppsV1Api(),
                # Add other API groups as needed: BatchV1Api for Jobs/CronJobs, etc.
            }
            self.active_clients[context_name] = clients # Cache it
            return clients
        except k8s_config_loader.ConfigException as e:
            print(f"SERVICE-K8S ERROR: Could not load K8s config for context '{context_name}': {e}")
            raise ConnectionError(f"Failed to connect to K8s for context {context_name}: {e}")


    def list_resources(self, space_id: str, environment_key: str, resource_type: str, namespace: str):
        clients = self._get_k8s_api_clients(space_id, environment_key)
        core_v1 = clients["core_v1"]
        apps_v1 = clients["apps_v1"]
        print(f"SERVICE-K8S: Listing {resource_type} in ns '{namespace}' for env '{environment_key}' of space '{space_id}'")
        
        items = []
        if resource_type.lower() == "pods":
            ret = core_v1.list_namespaced_pod(namespace=namespace, watch=False, limit=50)
            items = [{"name": i.metadata.name, "status": i.status.phase} for i in ret.items]
        elif resource_type.lower() == "deployments":
            ret = apps_v1.list_namespaced_deployment(namespace=namespace, watch=False, limit=50)
            items = [{"name": i.metadata.name, "replicas": i.spec.replicas, "ready": i.status.ready_replicas or 0} for i in ret.items]
        # Add more resource types (services, statefulsets, etc.)
        else:
            return {"success": False, "error": f"Unsupported resource type: {resource_type}"}
        return {"success": True, "resources": items}

    def apply_yaml_string(self, space_id: str, environment_key: str, namespace: str, yaml_string: str):
        clients = self._get_k8s_api_clients(space_id, environment_key) # Ensures correct context
        print(f"SERVICE-K8S: Applying YAML in ns '{namespace}' for env '{environment_key}' of space '{space_id}'")
        try:
            yaml_objects = list(yaml.safe_load_all(yaml_string))
            created_or_patched = []
            for obj_data in yaml_objects:
                if not obj_data: continue
                # Using create_from_yaml_single_item which handles create or patch
                # This requires the kubernetes client utils.
                # Ensure namespace in YAML metadata is honored or overridden by provided namespace.
                # For simplicity, let's assume the provided namespace takes precedence if obj_data doesn't have one.
                if 'metadata' not in obj_data: obj_data['metadata'] = {}
                obj_data['metadata']['namespace'] = obj_data['metadata'].get('namespace', namespace)
                
                # This is a simplified way. Kubernetes client has more robust methods.
                # k8s_client_dynamic = client.dynamic.DynamicClient(client.ApiClient(configuration=k8s_config_loader.Configuration.get_default_copy()))
                # api_version = obj_data["apiVersion"]
                # kind = obj_data["kind"]
                # resource_api = k8s_client_dynamic.resources.get(api_version=api_version, kind=kind)
                # resource_api.server_side_apply(body=obj_data, field_manager="vibe-devops-platform")

                # Fallback to a more direct approach if utils are not set up for this context
                # This is a placeholder for robust apply logic.
                # For actual apply, you'd often use the specific API client (e.g., apps_v1.create_namespaced_deployment)
                # or a helper that handles create/patch logic based on resource kind.
                print(f"Mock applying object: {obj_data.get('kind')}/{obj_data.get('metadata',{}).get('name')}")
                created_or_patched.append(f"{obj_data.get('kind')}/{obj_data.get('metadata',{}).get('name')} apply action sent.")

            if not created_or_patched:
                 return {"success": False, "error": "No valid K8s objects found in YAML."}
            return {"success": True, "message": "YAML applied successfully (mock).", "details": created_or_patched}
        except yaml.YAMLError as ye:
            return {"success": False, "error": f"Invalid YAML: {str(ye)}"}
        except Exception as e: # Catching FailToPatchError or others
            return {"success": False, "error": f"Failed to apply YAML: {str(e)}"}

    # TODO: Implement start_pod, stop_pod (delete pod), scale_deployment, etc.
    # These would use core_v1.delete_namespaced_pod, apps_v1.patch_namespaced_deployment_scale etc.
