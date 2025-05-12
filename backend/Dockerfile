# 使用官方 Python 镜像作为基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY ./app /app

# 暴露端口 (与 Flask 运行的端口一致)
EXPOSE 5000

# 运行应用
CMD ["python", "main.py"]
