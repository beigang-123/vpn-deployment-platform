-- ================================================
-- VPN Deployment Platform - Database Initialization
-- ================================================
-- Version: 1.0.0
-- Database: vpn_deploy
-- Author: VPN Deployment Platform Team
-- ================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS `vpn_deploy`
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `vpn_deploy`;

-- ================================================
-- Table: deployments
-- ================================================
-- Description: Stores VPN deployment information
-- ================================================

CREATE TABLE IF NOT EXISTS `deployments` (
  -- Primary Key
  `id` varchar(36) NOT NULL COMMENT 'UUID primary key',

  -- Server Information
  `serverIp` varchar(255) NOT NULL COMMENT 'Server IP address',
  `sshPort` int NOT NULL COMMENT 'SSH port',
  `username` varchar(100) NOT NULL COMMENT 'SSH username',
  `password` text DEFAULT NULL COMMENT 'Encrypted SSH password',
  `privateKey` text DEFAULT NULL COMMENT 'Encrypted SSH private key',

  -- VPN Configuration
  `vpnType` enum('v2ray', 'xray', 'wireguard', 'openvpn', 'trojan', 'shadowsocks') NOT NULL COMMENT 'VPN type',
  `status` enum('pending', 'deploying', 'running', 'stopped', 'starting', 'restarting', 'error', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT 'Deployment status',
  `vpnPort` int DEFAULT NULL COMMENT 'VPN service port',
  `uuid` varchar(100) DEFAULT NULL COMMENT 'UUID for VPN connection',

  -- Configuration Data
  `configJson` json DEFAULT NULL COMMENT 'VPN configuration JSON',
  `errorMessage` text DEFAULT NULL COMMENT 'Error message if deployment failed',

  -- Extended Fields
  `region` varchar(100) DEFAULT NULL COMMENT 'Server region/location',
  `nodeName` varchar(100) DEFAULT NULL COMMENT 'Custom node name',
  `expiryDate` date DEFAULT NULL COMMENT 'Deployment expiry date',

  -- Monitoring Metrics
  `systemMetrics` json DEFAULT NULL COMMENT 'System metrics (CPU, memory, disk, network)',
  `bandwidthMetrics` json DEFAULT NULL COMMENT 'Bandwidth usage metrics',
  `onlineUsers` int NOT NULL DEFAULT 0 COMMENT 'Current online users count',
  `onlineUsersList` json DEFAULT NULL COMMENT 'List of online users',
  `latency` int DEFAULT NULL COMMENT 'Network latency in ms',
  `lastHealthCheck` timestamp NULL DEFAULT NULL COMMENT 'Last health check timestamp',

  -- Deployment Details
  `deployPath` varchar(255) DEFAULT NULL COMMENT 'Installation path',
  `systemVersion` varchar(100) DEFAULT NULL COMMENT 'Operating system version',
  `autoRestart` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Auto-restart on error',
  `tags` text DEFAULT NULL COMMENT 'Tags (JSON string)',

  -- Timestamps
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',

  -- Indexes
  PRIMARY KEY (`id`),
  KEY `idx_serverIp` (`serverIp`),
  KEY `idx_status` (`status`),
  KEY `idx_vpnType` (`vpnType`),
  KEY `idx_region` (`region`),
  KEY `idx_created_at` (`createdAt`),
  KEY `idx_user` (`username`, `serverIp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='VPN deployment records';

-- ================================================
-- Initial Data / Seed Data (Optional)
-- ================================================

-- Example: Insert a demo deployment (commented out)
-- INSERT INTO `deployments` (
--   `id`, `serverIp`, `sshPort`, `username`, `vpnType`, `status`,
--   `region`, `nodeName`, `createdAt`, `updatedAt`
-- ) VALUES (
--   UUID(),
--   '127.0.0.1',
--   22,
--   'root',
--   'xray',
--   'pending',
--   'CN',
--   'Test Server',
--   NOW(),
--   NOW()
-- );

-- ================================================
-- Views for Common Queries
-- ================================================

-- View: Active Deployments
CREATE OR REPLACE VIEW `v_active_deployments` AS
SELECT
  id,
  serverIp,
  vpnType,
  status,
  region,
  nodeName,
  onlineUsers,
  latency,
  createdAt,
  updatedAt
FROM deployments
WHERE status IN ('running', 'starting', 'restarting');

-- View: Deployment Statistics
CREATE OR REPLACE VIEW `v_deployment_stats` AS
SELECT
  vpnType,
  status,
  COUNT(*) as count,
  SUM(onlineUsers) as totalOnlineUsers
FROM deployments
GROUP BY vpnType, status;

-- ================================================
-- Stored Procedures (Optional)
-- ================================================

DELIMITER $$

-- Procedure: Clean old error deployments
CREATE PROCEDURE IF NOT EXISTS `sp_clean_old_errors`(
  IN days_to_keep INT
)
BEGIN
  DELETE FROM deployments
  WHERE status = 'error'
    AND createdAt < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
END$$

-- Procedure: Update deployment health status
CREATE PROCEDURE IF NOT EXISTS `sp_update_health_check`(
  IN deployment_id VARCHAR(36),
  IN health_status VARCHAR(50),
  IN latency_val INT
)
BEGIN
  UPDATE deployments
  SET
    status = health_status,
    latency = latency_val,
    lastHealthCheck = NOW(),
    updatedAt = NOW()
  WHERE id = deployment_id;
END$$

DELIMITER ;

-- ================================================
-- Triggers (Optional)
-- ================================================

-- Trigger: Log status changes
-- DELIMITER $$
-- CREATE TRIGGER IF NOT EXISTS `trg_status_change_log`
-- BEFORE UPDATE ON deployments
-- FOR EACH ROW
-- BEGIN
--   IF OLD.status != NEW.status THEN
--     INSERT INTO status_logs (deploymentId, oldStatus, newStatus, changedAt)
--     VALUES (OLD.id, OLD.status, NEW.status, NOW());
--   END IF;
-- END$$
-- DELIMITER ;

-- ================================================
-- Verification
-- ================================================

-- Display database information
SELECT
  DATABASE() as 'Current Database',
  VERSION() as 'MySQL Version',
  NOW() as 'Initialization Time';

-- Display created tables
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    TABLE_COMMENT
FROM
    information_schema.TABLES
WHERE
    TABLE_SCHEMA = 'vpn_deploy'
ORDER BY
    TABLE_NAME;

-- ================================================
-- Completion Message
-- ================================================

SELECT 'Database initialization completed successfully!' AS Status;
