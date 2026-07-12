package com.myproject.clinic.rag.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Factory chọn đúng Strategy handler dựa trên intent string.
 *
 * Spring tự inject toàn bộ bean implement ChatbotIntentStrategy.
 * Factory gom vào Map<intent, strategy> khi khởi động.
 *
 */
@Component
@Slf4j
public class IntentStrategyFactory {

    private final Map<String, ChatbotIntentStrategy> strategyMap;
    private final ChatbotIntentStrategy unknownStrategy;

    public IntentStrategyFactory(List<ChatbotIntentStrategy> strategies) {
        this.strategyMap = new HashMap<>();

        ChatbotIntentStrategy unknown = null;
        for (ChatbotIntentStrategy strategy : strategies) {
            strategyMap.put(strategy.getSupportedIntent(), strategy);
            if ("UNKNOWN".equals(strategy.getSupportedIntent())) {
                unknown = strategy;
            }
            log.info("[IntentStrategyFactory] Registered strategy: {} -> {}",
                    strategy.getSupportedIntent(), strategy.getClass().getSimpleName());
        }

        this.unknownStrategy = unknown != null ? unknown : strategies.get(0);
    }

    public ChatbotIntentStrategy getStrategy(String intent) {
        if (intent == null)
            return unknownStrategy;
        ChatbotIntentStrategy strategy = strategyMap.get(intent.toUpperCase());
        if (strategy == null) {
            log.warn("[IntentStrategyFactory] No strategy for intent '{}', using UNKNOWN", intent);
            return unknownStrategy;
        }
        return strategy;
    }
}
