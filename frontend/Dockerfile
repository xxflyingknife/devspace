# 阶段1: 构建 React 应用
FROM node:18-alpine as builder

WORKDIR /app

COPY package.json ./
# COPY package-lock.json ./ # 如果你有 package-lock.json
# COPY yarn.lock ./ # 如果你使用 yarn

RUN npm install
# RUN yarn install # 如果你使用 yarn

COPY . .
RUN npm run build
# RUN yarn build # 如果你使用 yarn

# 阶段2: 使用 Nginx 服务静态文件
FROM nginx:1.25-alpine

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从 builder 阶段复制构建好的静态文件到 Nginx 的 html 目录
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
