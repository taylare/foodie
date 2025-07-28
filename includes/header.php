<?php session_start(); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Planner</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<header>
    <nav>
        <a href="home.php">Home</a>
        <a href="my-recipes.php">My Recipes</a>
        <a href="meal-planner.php">Meal Planner</a>
        <a href="shopping-list.php">Shopping List</a>
        <?php if (isset($_SESSION['user_id'])): ?>
            <a href="logout.php">Logout</a>
        <?php else: ?>
            <a href="login.php">Login</a>
            <a href="register.php">Register</a>
        <?php endif; ?>
    </nav>
</header>
<main>
