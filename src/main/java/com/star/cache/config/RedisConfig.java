package com.star.cache.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/*
* RedissonClient 注入
* */
@Configuration
public class RedisConfig {
    @Value("${redisson.address}")
    private String redisAddress;

    @Bean
    public RedissonClient redisClient() {
        Config config = new Config();
        config.useSingleServer().setAddress(redisAddress);
        return Redisson.create(config);
    }

}
