<?php include '../includes/header.php'; ?>
<h2>Add Your Own Recipe</h2>
<form method="POST" action="../api/saveRecipe.php">
    <input name="title" placeholder="Title" required><br>
    <textarea name="ingredients" placeholder="Ingredients (comma-separated)" required></textarea><br>
    <textarea name="instructions" placeholder="Instructions" required></textarea><br>
    <input name="image_url" placeholder="Image URL"><br>
    <select name="category">
        <option>Breakfast</option>
        <option>Lunch</option>
        <option>Dinner</option>
        <option>Dessert</option>
    </select><br>
    <button type="submit">Save</button>
</form>
<?php include '../includes/footer.php'; ?>
