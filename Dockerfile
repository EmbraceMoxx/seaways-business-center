
# 阶段 1: 构建 (Build Stage)
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:22-alpine3.22 AS build

WORKDIR /app

# 安装 pnpm 
RUN npm install -g pnpm

# 1. 先复制依赖定义文件，利用 Docker 层缓存
COPY package.json pnpm-lock.yaml ./

# 设置国内源 
RUN pnpm config set registry https://registry.npmmirror.com/

# 2. 安装所有依赖 
RUN pnpm install 

# 3. 复制源代码并构建
COPY . .
RUN pnpm build 

# 4. 清理开发依赖，只保留生产依赖 
# RUN pnpm prune --prod   

# 阶段 2: 生产运行

FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:22-alpine3.22 AS production


WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV TZ=Asia/Shanghai

# 复制必要文件
COPY package.json pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# 暴露端口
EXPOSE 8081

# 切换到非 root 用户
# USER node

CMD ["node", "dist/main"]


