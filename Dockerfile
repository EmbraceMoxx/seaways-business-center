# 使用 Node.js 作为基础镜像
FROM node:lts-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json、package-lock.json 和 pnpm-lock.yaml 到工作目录
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 使用阿里云的npm镜像
COPY .npmrc .npmrc

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --production

# 设置环境变量
ENV NODE_ENV=production

# 设置 Node.js 的最大内存限制为 32GB
ENV NODE_OPTIONS="--max-old-space-size=6144"

# 暴露容器端口
EXPOSE 8081

# 运行 Nest.js 应用
CMD ["node", "dist/main"]