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

        <p><strong>Ingredients:</strong></p>
        <ul>
        <?php foreach (explode("\n", $recipe['ingredients']) as $ingredient): ?>
            <li class="text-start"><?= htmlspecialchars(trim($ingredient)) ?></li>
        <?php endforeach; ?>
        </ul>
        <p><strong>Instructions:</strong><br>
            <?php
            $truncated = mb_strimwidth(strip_tags($recipe['instructions']), 0, 100, "...");
            echo nl2br(htmlspecialchars($truncated));
            ?>
            <p><a href="view-recipe.php?id=<?= $recipe['id'] ?>">Read more</a></p>
        </p>
</div>

