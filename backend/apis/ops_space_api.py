from flask import Blueprint, request, jsonify
# TODO: Import K8sService, AIOpsSkillService (PluginManager), TaskSchedulerService, PromptService
# from services.k8s_service import k8s_service
# from plugins.skill_manager import skill_manager
# from services.task_scheduler_service import task_scheduler_service
# from services.prompt_service import prompt_service # Manages ChatSessionNote

ops_space_bp = Blueprint('ops_space_api', __name__)

@ops_space_bp.route('/workloads', methods=['GET'])
def get_ops_workloads():
    space_id = request.args.get('spaceId') # Or appId from frontend
    if not space_id:
        return jsonify({"error": "Missing 'spaceId' query parameter"}), 400
    # TODO:
    # ops_config = space_service.get_ops_config(space_id)
    # if not ops_config:
    #     return jsonify({"error": "Ops space configuration not found"}), 404
    # workloads = k8s_service.get_monitored_workloads(ops_config) # And/or CMDB service
    # return jsonify({"workloads": workloads})
    mock_workloads = [
        {"id": "wl1", "name": "ops-critical-service-pods", "type": "pods", "status": "Healthy"},
        {"id": "wl2", "name": "ops-database-cluster", "type": "statefulset", "status": "Warning"},
    ]
    return jsonify({"workloads": mock_workloads})

@ops_space_bp.route('/aiops/skills', methods=['GET'])
def list_aiops_skills():
    space_id = request.args.get('spaceId') # To potentially filter skills enabled for a space
    # TODO: skills = skill_manager.list_available_skills(space_id)
    # return jsonify({"skills": skills})
    return jsonify({"skills": [
        {"id": "skill_anomaly", "name": "Anomaly Detection", "description": "Detects anomalies in metrics."},
        {"id": "skill_log_parsing", "name": "Log Parsing", "description": "Parses and categorizes logs."}
    ]})

@ops_space_bp.route('/sre/plans', methods=['GET'])
def list_sre_plans():
    space_id = request.args.get('spaceId')
    # TODO: plans = task_scheduler_service.get_plans_for_space(space_id)
    # return jsonify({"sre_plans": plans})
    return jsonify({"sre_plans": [
        {"id": "plan1", "name": "DB Failover Plan", "next_run": "N/A", "status": "Idle"},
        {"id": "plan2", name: "Scale Web Tier", "schedule": "OnDemand", "status": "Ready"}
    ]})

@ops_space_bp.route('/prompts', methods=['GET'])
def list_saved_prompts():
    space_id = request.args.get('spaceId')
    # TODO: prompts = prompt_service.get_prompts_for_space(space_id)
    # return jsonify({"saved_prompts": prompts})
    return jsonify({"saved_prompts": [
        {"id": "prm1", "title": "Analyze High CPU Pod", "type": "prompt_template"},
        {"id": "prm2", "title": "K8s Network Troubleshooting Steps", "type": "chat_log"}
    ]})

# TODO: Add POST/PUT/DELETE endpoints for SRE plans and Prompts

