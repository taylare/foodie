<div class="calendar-day">
    <h4><?= $day ?></h4>
    <?php foreach ($meals as $meal): ?>
        <div class="meal-slot">
            <strong><?= ucfirst($meal['meal_type']) ?>:</strong> <?= htmlspecialchars($meal['title']) ?>
        </div>
    <?php endforeach; ?>
</div>