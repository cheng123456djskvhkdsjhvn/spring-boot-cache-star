import http from 'k6/http';
import { check } from 'k6';

/**
 * k6 性能测试脚本 - 热点数据缓存场景
 * 
 * 测试配置：
 * - 2000 VU（虚拟用户）
 * - 10s 内拉起，持续 50s
 * - 目标：QPS ≥ 12000, P99 ≤ 120ms, Error = 0
 * 
 * 运行方式：
 *   docker-compose -f k6/docker-compose.k6.yml up
 */

export let options = {
  stages: [
    { duration: '10s', target: 2000 }, // 10s 内拉起 2000 VU
    { duration: '50s', target: 2000 }, // 持续 50s
  ],
  thresholds: {
    http_req_failed: ['rate==0'],      // Error 0
    http_req_duration: ['p(99)<=120'], // P99 ≤ 120 ms
  },
};

// 支持环境变量配置，本地运行默认 localhost，Docker 运行使用 app:8081
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';

export default function () {
  // 96% 命中率：96% 请求访问热点数据（1-50），4% 访问冷数据（51-1000）
  let r = Math.random();
  let id = r < 0.96 
    ? Math.floor(Math.random() * 50) + 1      // 热点数据：1-50
    : Math.floor(Math.random() * 950) + 51;   // 冷数据：51-1000
  
  let res = http.get(`${BASE_URL}/api/hot?id=${id}`);
  
  check(res, {
    'status 200': r => r.status === 200,
  });
}

// 自定义摘要输出，生成中文性能测试报告
export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
  };
}

function textSummary(data) {
  let output = '\n';
  output += '═'.repeat(80) + '\n';
  output += '📊 性能测试摘要报告\n';
  output += '═'.repeat(80) + '\n\n';
  
  // HTTP响应时间统计（包含P90、P95、P99）
  if (data.metrics.http_req_duration) {
    const metrics = data.metrics.http_req_duration;
    output += '⏱️  HTTP响应时间统计:\n';
    output += `  平均值 (avg): ${(metrics.values.avg / 1000).toFixed(2)} ms\n`;
    output += `  最小值 (min): ${(metrics.values.min / 1000).toFixed(2)} ms\n`;
    output += `  最大值 (max): ${(metrics.values.max / 1000).toFixed(2)} ms\n`;
    output += `  中位数 (med): ${(metrics.values.med / 1000).toFixed(2)} ms\n`;
    
    // P90、P95、P99 百分位数
    if (metrics.values['p(90)']) {
      output += `  P90 (90%的请求): ${(metrics.values['p(90)'] / 1000).toFixed(2)} ms\n`;
    }
    if (metrics.values['p(95)']) {
      output += `  P95 (95%的请求): ${(metrics.values['p(95)'] / 1000).toFixed(2)} ms\n`;
    }
    if (metrics.values['p(99)']) {
      output += `  P99 (99%的请求): ${(metrics.values['p(99)'] / 1000).toFixed(2)} ms ⭐ [目标: <120ms]\n`;
    } else {
      // 如果 P99 不存在，尝试从 thresholds 中获取，或提示需要配置
      output += `  P99 (99%的请求): ⚠️  未计算（需要在运行命令中添加 --summary-trend-stats="min,avg,med,p(90),p(95),p(99),max"）\n`;
    }
    output += '\n';
  }
  
  // 请求统计
  if (data.metrics.http_reqs) {
    const metrics = data.metrics.http_reqs;
    output += '📈 请求统计:\n';
    output += `  总请求数: ${metrics.values.count.toLocaleString()}\n`;
    output += `  QPS: ${metrics.values.rate.toFixed(2)} 请求/秒 [目标: >12000]\n`;
    output += '\n';
  }
  
  // 错误统计
  if (data.metrics.http_req_failed) {
    const metrics = data.metrics.http_req_failed;
    output += `❌ 错误率: ${(metrics.values.rate * 100).toFixed(4)}%\n\n`;
  }
  
  // 检查统计
  if (data.metrics.checks) {
    const metrics = data.metrics.checks;
    output += `✅ 检查通过率: ${(metrics.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  // 性能达标情况
  output += '🎯 性能指标达标情况:\n';
  const qps = data.metrics.http_reqs?.values?.rate || 0;
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] ? 
              data.metrics.http_req_duration.values['p(99)'] / 1000 : null;

  output += `  QPS: ${qps >= 12000 ? '✅' : '❌'} ${qps.toFixed(2)} (目标: ≥12000)\n`;
  if (p99 !== null) {
    output += `  P99: ${p99 < 120 ? '✅' : '❌'} ${p99.toFixed(2)}ms (目标: <120ms)\n`;
  } else {
    output += `  P99: ⚠️  未计算（需要使用 --summary-trend-stats 参数）\n`;
  }
  
  output += '\n' + '═'.repeat(80) + '\n';
  return output;
}

