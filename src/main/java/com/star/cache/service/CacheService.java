package com.star.cache.service;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.cache.CaffeineCacheMetrics;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class CacheService {
    //L1 本地缓存：最大1w键，5分钟过期
    private final Cache<Long, String> localCache = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .recordStats()                 //开启统计
            .build();

    @Resource
    private RedissonClient redissonClient;

    public String getHotData(Long id) {
        // 使用 get 方法，如果缓存未命中则从 Redis 加载
        // 注意：如果 Redis 返回 null，Caffeine 不会缓存 null 值
        return localCache.get(id, k -> {
            //L2 redis查询
            String value = redissonClient.<String>getBucket("hot:" + k).get();
            // 如果 Redis 返回 null，返回空字符串占位符（避免重复查询）
            return value != null ? value : "";
        });
    }
    
    /**
     * 获取缓存统计信息（用于调试）
     */
    public CacheStats getCacheStats() {
        return localCache.stats();
    }

    @Autowired
    private MeterRegistry meterRegistry;

    @PostConstruct
    public void init() {
        //把Caffeine的命中率暴露到/actuator/metrics
        CaffeineCacheMetrics.monitor(meterRegistry, localCache, "l1_cache");
        
        // 注册自定义的 hitRate 指标
        Gauge.builder("l1_cache.hitRate", localCache, cache -> {
            CacheStats stats = cache.stats();
            long requestCount = stats.requestCount();
            if (requestCount == 0) {
                return 0.0;
            }
            return stats.hitCount() / (double) requestCount;
        })
        .description("L1 cache hit rate")
        .register(meterRegistry);
        
        log.info(">>>> l1_cache metric registered, including hitRate");
    }
}
