package com.star.cache.controller;

import com.github.benmanes.caffeine.cache.stats.CacheStats;
import com.star.cache.service.CacheService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CacheController {
    @Resource
    CacheService cacheService;

    /*
     * 靶接口：/api/hot?id=123
     * */
    @GetMapping("/hot")
    public String hot(@RequestParam("id") Long id) {
        return cacheService.getHotData(id);
    }
    
    /*
     * 调试接口：查看缓存统计信息
     * */
    @GetMapping("/cache/stats")
    public Map<String, Object> cacheStats() {
        CacheStats stats = cacheService.getCacheStats();
        Map<String, Object> result = new HashMap<>();
        result.put("requestCount", stats.requestCount());
        result.put("hitCount", stats.hitCount());
        result.put("missCount", stats.missCount());
        result.put("hitRate", stats.requestCount() > 0 ? 
            stats.hitCount() / (double) stats.requestCount() : 0.0);
        result.put("missRate", stats.requestCount() > 0 ? 
            stats.missCount() / (double) stats.requestCount() : 0.0);
        result.put("evictionCount", stats.evictionCount());
        result.put("loadCount", stats.loadCount());
        result.put("loadSuccessCount", stats.loadSuccessCount());
        result.put("loadFailureCount", stats.loadFailureCount());
        result.put("averageLoadPenalty", stats.averageLoadPenalty());
        return result;
    }
}
