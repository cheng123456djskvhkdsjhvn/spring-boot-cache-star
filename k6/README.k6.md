# k6 性能测试说明

## 快速运行

```bash
# 确保业务服务已启动
docker compose up -d

# 运行 k6 压测
docker compose -f k6/docker-compose.k6.yml up
```

> **注意**：如果使用 Docker Compose V1，请将 `docker compose` 替换为 `docker-compose`

## 测试配置

- **VU 数量**：2000
- **测试时长**：60 秒（10s 预热 + 50s 稳定）
- **目标 QPS**：≥ 12,000
- **目标 P99**：≤ 120ms

## 自定义配置

修改 `k6/cache-test.js` 中的 `options` 对象：

```js
export let options = {
  stages: [
    { duration: '10s', target: 2000 },
    { duration: '50s', target: 2000 },
  ],
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(99)<=120'],
  },
};
```

## 环境变量

- `BASE_URL`：目标服务地址（默认：`http://app:8081`）

## 本地运行（不使用 Docker）

```bash
# 安装 k6
# Windows: choco install k6
# Mac: brew install k6
# Linux: 参考 https://k6.io/docs/getting-started/installation/

# 运行测试
k6 run --summary-trend-stats="avg,med,p(90),p(95),p(99),max" cache-test.js
```

