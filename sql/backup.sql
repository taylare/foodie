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



-- Insert 10 recipes tied to 'test' user
INSERT INTO recipes (user_id, title, ingredients, instructions, image_url, source, category, servings)
VALUES
((SELECT user_id FROM users WHERE username = 'test'), 'Ricotta Pasta',
 '12 oz pasta\n1 cup ricotta\nZest of 1 lemon\n2 tbsp olive oil\nSalt & pepper',
 'Boil pasta until al dente. Mix ricotta, lemon zest, olive oil, and seasoning. Toss with pasta.', 
 'https://images.unsplash.com/photo-1603079842519-b6c1cf8f11e0', 'user', 'Dinner', 2),

((SELECT user_id FROM users WHERE username = 'test'), 'Avocado Toast',
 '2 slices sourdough\n1 ripe avocado\nChili flakes\nSalt',
 'Toast bread. Mash avocado and spread on toast. Top with chili flakes and salt.', 
 'https://images.unsplash.com/photo-1559628233-4b8b5f9f9a44', 'user', 'Breakfast', 1),

((SELECT user_id FROM users WHERE username = 'test'), 'Chicken Stir Fry',
 'Chicken breast\nBell pepper\nSoy sauce\nGarlic\nGinger\nBroccoli',
 'Sauté chicken until golden. Add vegetables and sauce. Stir-fry until cooked through.', 
 'https://images.unsplash.com/photo-1604335399106-a84db45d5c5d', 'user', 'Lunch', 2),

((SELECT user_id FROM users WHERE username = 'test'), 'Berry Smoothie',
 'Frozen berries\nBanana\nGreek yogurt\nHoney\nAlmond milk',
 'Blend all ingredients until smooth. Serve chilled.', 
 'https://images.unsplash.com/photo-1522184216315-dc3c9c6e13b5', 'user', 'Breakfast', 1),

((SELECT user_id FROM users WHERE username = 'test'), 'Tomato Soup',
 'Tomatoes\nOnion\nGarlic\nVegetable broth\nCream\nBasil',
 'Sauté onion and garlic. Add tomatoes and broth. Simmer, blend, and add cream.', 
 'https://images.unsplash.com/photo-1617196034030-3e7e7b2d0ccf', 'user', 'Dinner', 2),

((SELECT user_id FROM users WHERE username = 'test'), 'Grilled Cheese',
 '2 slices bread\nCheddar cheese\nButter',
 'Butter bread. Add cheese in between. Grill until golden.', 
 'https://images.unsplash.com/photo-1613145999833-6d3279e3ed7e', 'user', 'Lunch', 1),

((SELECT user_id FROM users WHERE username = 'test'), 'Pancakes',
 'Flour\nEgg\nMilk\nBaking powder\nSugar\nMaple syrup',
 'Mix dry ingredients. Add egg and milk. Cook in skillet and serve with syrup.', 
 'https://images.unsplash.com/photo-1551024601-bec78aea704b', 'user', 'Breakfast', 2),

((SELECT user_id FROM users WHERE username = 'test'), 'Caesar Salad',
 'Romaine lettuce\nCroutons\nCaesar dressing\nParmesan\nChicken (optional)',
 'Toss lettuce with dressing. Top with croutons, parmesan, and chicken if desired.', 
 'https://images.unsplash.com/photo-1589308078054-8325f87c6dba', 'user', 'Lunch', 2),

((SELECT user_id FROM users WHERE username = 'test'), 'Spaghetti Bolognese',
 'Spaghetti\nGround beef\nTomato sauce\nOnion\nGarlic\nOregano',
 'Cook beef with onion and garlic. Add sauce and oregano. Simmer and serve over pasta.', 
 'https://images.unsplash.com/photo-1613149402630-8725026656b2', 'user', 'Dinner', 3),

((SELECT user_id FROM users WHERE username = 'test'), 'Veggie Omelette',
 'Eggs\nMushroom\nSpinach\nCheese\nTomato\nSalt & pepper',
 'Whisk eggs. Cook veggies. Pour eggs and cook until set. Fold and serve.', 
 'https://images.unsplash.com/photo-1601050690597-9a9b59d1f40c', 'user', 'Breakfast', 1);
