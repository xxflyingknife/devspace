# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Install system dependencies (if any)
# For example, if your tools need 'git' or 'kubectl' command-line tools:
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     git \
#     # kubectl # Consider if kubectl is truly needed in the container vs. Python client
#     && rm -rf /var/lib/apt/lists/*
# Note: Installing kubectl can make the image larger. The Python k8s client is preferred.

# Copy the dependencies file to the working directory
COPY requirements.txt ./

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir --upgrade pip &&     pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code to the working directory
# Copy only necessary modules/packages defined in our structure
COPY app.py .
COPY config.py .
COPY database ./database
COPY apis ./apis
COPY services ./services
COPY tools ./tools
COPY plugins ./plugins
COPY core ./core
# Ensure .env is NOT copied if it contains secrets. Use runtime ENV VARS for Docker.

# Make port available to the world outside this container
# This should match the port your Flask app runs on
EXPOSE 5001

# Define environment variables (can be overridden at runtime)
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5001
# IMPORTANT: GOOGLE_API_KEY and other secrets MUST be provided at runtime
# (e.g., via docker run -e, docker-compose.yml, or Kubernetes secrets)
# ENV GOOGLE_API_KEY="your_api_key_in_runtime_not_here"

# Command to run the application when the container launches
# For production, use Gunicorn or another WSGI server
# CMD ["gunicorn", "--conf", "gunicorn_conf.py", "app:app"]
# For development/simplicity using Flask's built-in server:
CMD ["flask", "run"]
# Or directly if app.run() is configured:
# CMD ["python", "app.py"]
