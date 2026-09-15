-- =============================================================================
-- Migration: add ml_scores table
-- Run once:  mysql -u <user> -p <db> < migrations/001_add_ml_scores.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_scores (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_id        VARCHAR(30) NOT NULL,           -- trip or vehicle id
  entity_type      ENUM('trip','vehicle') NOT NULL,
  delay_score      DECIMAL(5,1) NOT NULL DEFAULT 0,
  fuel_score       DECIMAL(5,1) NOT NULL DEFAULT 0,
  traffic_score    DECIMAL(5,1) NOT NULL DEFAULT 0,
  behaviour_score  DECIMAL(5,1) NOT NULL DEFAULT 0,
  maintenance_score DECIMAL(5,1) NOT NULL DEFAULT 0,
  overall_score    DECIMAL(5,1) NOT NULL DEFAULT 0,
  risk_level       ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
  risk_factors     JSON,                            -- array of strings
  recommendations  JSON,                            -- array of strings
  scored_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ml_entity       (entity_id, entity_type),
  INDEX idx_ml_risk_level   (risk_level),
  INDEX idx_ml_scored_at    (scored_at)
);
