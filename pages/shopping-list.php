<?php
include '../includes/header.php';
include '../includes/db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];
$today = new DateTime();
$monday = (clone $today)->modify('monday this week')->format('Y-m-d');
$sunday = (clone $today)->modify('sunday this week')->format('Y-m-d');

// Get meal plan for the week
$stmt = $conn->prepare("
    SELECT mp.date, mp.meal_type, r.id as recipe_id, r.title, r.ingredients
    FROM meal_plan mp
    JOIN recipes r ON mp.recipe_id = r.id
    WHERE mp.user_id = ? AND mp.date BETWEEN ? AND ?
    ORDER BY mp.date, FIELD(mp.meal_type, 'breakfast', 'lunch', 'dinner')
");
$stmt->bind_param("iss", $user_id, $monday, $sunday);
$stmt->execute();
$result = $stmt->get_result();

$shoppingData = []; // [date][meal_type][] = ['title' => ..., 'ingredients' => ..., 'id' => ...]
while ($row = $result->fetch_assoc()) {
    $date = $row['date'];
    $meal = $row['meal_type'];
    $shoppingData[$date][$meal][] = [
        'title' => $row['title'],
        'ingredients' => preg_split("/\r\n|\n|\r|,/", $row['ingredients']),
        'id' => $row['recipe_id']
    ];
}
?>

<h2>Shopping List</h2>

<?php if (empty($shoppingData)): ?>
    <p>You have no meals planned this week.</p>
<?php else: ?>
    <p>Based on your meal plan, here's your shopping list organised by day, meal, and recipe:</p>
    <div class="shopping-wrapper">
        <?php foreach ($shoppingData as $date => $meals): ?>
            <div class="shopping-card">
                <h3><?= date('l, M j', strtotime($date)) ?></h3>
                <div class="meal-row">
                    <?php foreach (['breakfast', 'lunch', 'dinner'] as $mealType): ?>
                        <div class="meal-column">
                            <h4><?= ucfirst($mealType) ?></h4>
                            <?php if (!empty($meals[$mealType])): ?>
                                <?php foreach ($meals[$mealType] as $recipe): ?>
                                    <div class="recipe-block">
                                        <a href="view-recipe.php?id=<?= $recipe['id'] ?>" class="recipe-title">
                                            <?= htmlspecialchars($recipe['title']) ?>
                                        </a>
                                        <ul>
                                            <?php foreach ($recipe['ingredients'] as $ingredient): 
                                                $ingredient = trim($ingredient);
                                                if ($ingredient === '') continue;
                                                $key = md5($date . $mealType . $recipe['id'] . $ingredient); ?>
                                                <li class="shopping-item" data-key="<?= $key ?>">
                                                    <?= htmlspecialchars($ingredient) ?>
                                                </li>
                                            <?php endforeach; ?>
                                        </ul>
                                    </div>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <p class="no-recipe">No recipe</p>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<style>
.shopping-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 1rem;
}

.shopping-card {
    background: #fff5f8;
    border-radius: 1rem;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    padding: 1rem 1.5rem;
    min-width: 280px;
    max-width: 100%;
    flex: 1 1 100%;
}

.meal-row {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    justify-content: space-between;
    flex-wrap: wrap;
}

.meal-column {
    flex: 1;
    min-width: 200px;
    background: #fff;
    padding: 0.8rem;
    border-radius: 0.75rem;
    box-shadow: inset 0 0 0 1px #ffe1ec;
    background-color: #fffafc;
}

.recipe-block {
    margin-bottom: 1rem;
}

.recipe-title {
    font-weight: bold;
    font-size: 1.1rem;
    display: inline-block;
    margin-bottom: 0.5rem;
    color: #d43f8d;
    text-decoration: none;
}

.recipe-title:hover {
    text-decoration: underline;
}

.shopping-item {
    cursor: pointer;
}

.crossed-off {
    text-decoration: line-through;
    opacity: 0.6;
}

.no-recipe {
    font-style: italic;
    color: #999;
}
</style>

<script>
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('.shopping-item').forEach(item => {
        const key = item.getAttribute('data-key');
        if (localStorage.getItem(key) === 'crossed') {
            item.classList.add('crossed-off');
        }

        item.addEventListener('click', () => {
            item.classList.toggle('crossed-off');
            if (item.classList.contains('crossed-off')) {
                localStorage.setItem(key, 'crossed');
            } else {
                localStorage.removeItem(key);
            }
        });
    });
});
</script>

<?php include '../includes/footer.php'; ?>
