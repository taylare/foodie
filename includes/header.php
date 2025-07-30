<?php session_start(); ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recipe Planner</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>
  <link rel="stylesheet" href="../assets/css/style.css" />
</head>
<body>

<nav class="navbar navbar-expand-lg">
  <div class="container">
    <a class="navbar-brand fw-bold text-pink" href="my-recipes.php">
      🍥<?= isset($_SESSION['username']) ? htmlspecialchars($_SESSION['username']) . "'s Meal Planner" : 'Meal Planner' ?>
    </a>

    <!-- Hamburger menu toggle button -->
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" 
            aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

    <!-- Collapsible menu items -->
    <div class="collapse navbar-collapse" id="navbarNavDropdown">
      <ul class="navbar-nav ms-auto">
        <?php if (isset($_SESSION['user_id'])): ?>
          <li class="nav-item"><a class="nav-link" href="my-recipes.php">My Recipes</a></li>
          <li class="nav-item"><a class="nav-link" href="meal-planner.php">Meal Planner</a></li>
          <li class="nav-item"><a class="nav-link" href="shopping-list.php">Shopping List</a></li>
          <li class="nav-item"><a class="nav-link" href="logout.php">Logout</a></li>
        <?php else: ?>
          <li class="nav-item"><a class="nav-link" href="login.php">Login</a></li>
          <li class="nav-item"><a class="nav-link" href="register.php">Register</a></li>
        <?php endif; ?>
      </ul>

      <!-- 🌙 Theme Toggle Button -->
      <button id="themeToggle" class="btn btn-sm ms-3" aria-label="Toggle Dark Mode" style="font-size: 1.4rem;">
        🌙
      </button>
    </div>
  </div>
</nav>

<main class="container">

<!-- 🌙 Theme toggle script -->
<script>
  document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById('themeToggle');
    const root = document.documentElement;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    root.setAttribute('data-theme', savedTheme);
    toggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    // Toggle and save preference
    toggleBtn.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      toggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  });
</script>
