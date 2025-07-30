DROP TABLE IF EXISTS recipe_ingredients;
DROP TABLE IF EXISTS meal_plan;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS users;


-- USERS TABLE

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

-- RECIPES TABLE

CREATE TABLE recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255),
  ingredients TEXT,
  instructions TEXT,
  image_url VARCHAR(255),
  source ENUM('user', 'api') DEFAULT 'user',
  category VARCHAR(50),
  servings INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- MEAL PLAN TABLE

CREATE TABLE meal_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  meal_type ENUM('breakfast', 'lunch', 'dinner'),
  recipe_id INT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Add unique constraint to prevent duplicate meal slots per user per day
ALTER TABLE meal_plan 
ADD UNIQUE KEY unique_plan (user_id, date, meal_type);

