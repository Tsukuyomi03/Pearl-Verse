-- Battle Pass Rewards Table
-- This table tracks which battle pass level rewards have been claimed by users

CREATE TABLE `battle_pass_claims` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `level` int(11) NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_data` json DEFAULT NULL,
  `pearls_awarded` int(11) DEFAULT 0,
  `claimed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_level_claim` (`user_id`, `level`),
  KEY `user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
