<div class="recipe-card">
        <img 
            src="<?= $recipe['image_url'] ?>" 
            alt="<?= htmlspecialchars($recipe['title']) ?>" 
            style="
                width: 100%; 
                max-height: 200px; 
                object-fit: contain; 
                border-radius: 10px; 
                margin-bottom: 10px; 
                display: block; 
                margin-left: auto; 
                margin-right: auto;
            "
            >
        <h3><?= htmlspecialchars($recipe['title']) ?></h3>

            <p><a style="color: orange;" href="view-recipe.php?id=<?= $recipe['id'] ?>">View Recipe</a></p>
        </p>
</div>

