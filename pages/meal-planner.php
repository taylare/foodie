<?php
include '../includes/header.php';
include '../includes/db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];

// Handle reset
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['reset_meal_plan'])) {
    $deleteStmt = $conn->prepare("DELETE FROM meal_plan WHERE user_id = ?");
    $deleteStmt->bind_param("i", $user_id);
    $deleteStmt->execute();
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// Handle save
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_meal_plan'])) {
    foreach ($_POST['meal'] as $date => $mealsForDay) {
        foreach ($mealsForDay as $meal_type => $recipe_id) {
            if (!empty($recipe_id)) {
                $stmt = $conn->prepare("REPLACE INTO meal_plan (user_id, date, meal_type, recipe_id) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("issi", $user_id, $date, $meal_type, $recipe_id);
                $stmt->execute();
            }
        }
    }
}

$recipes = [];
$res = $conn->prepare("SELECT id, title FROM recipes WHERE user_id = ?");
$res->bind_param("i", $user_id);
$res->execute();
$result = $res->get_result();
while ($row = $result->fetch_assoc()) {
    $recipes[] = $row;
}

$saved = [];
$planQuery = $conn->prepare("SELECT * FROM meal_plan WHERE user_id = ?");
$planQuery->bind_param("i", $user_id);
$planQuery->execute();
$planResult = $planQuery->get_result();
while ($row = $planResult->fetch_assoc()) {
    $saved[$row['date']][$row['meal_type']] = $row['recipe_id'];
}

$days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
$meals = ["breakfast", "lunch", "dinner"];

$today = new DateTime();
$monday = (clone $today)->modify('monday this week');
?>
<body class="meal-planner">
<h2 class="text-pink fw-bold mb-4">🍽️ Meal Planner</h2>

<!-- Trigger Button -->
<button class="btn btn-pink mb-4" data-bs-toggle="modal" data-bs-target="#mealPlannerModal">
  Set Weekly Meal Plan
</button>

<!-- Modal -->
<div class="modal fade modal-mealplanner" id="mealPlannerModal" tabindex="-1" aria-labelledby="mealPlannerModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-scrollable modal-lg">
    <div class="modal-content">

      <div class="modal-header">
        <h5 class="modal-title" id="mealPlannerModalLabel">Set Weekly Meal Plan</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>

      <form method="POST">
        <div class="modal-body">
          <?php foreach ($days as $i => $day): 
            $date = (clone $monday)->modify("+$i days")->format('Y-m-d');
          ?>
            <div class="mb-3">
              <div class="meal-day"><?php echo $day; ?></div>
              <div class="row">
                <?php foreach ($meals as $meal): ?>
                  <div class="col-md-4 mb-2">
                    <select name="meal[<?php echo $date; ?>][<?php echo $meal; ?>]" class="form-select meal-select">
                      <option value="">-- <?php echo $meal; ?> --</option>
                      <?php foreach ($recipes as $recipe): ?>
                        <option value="<?php echo $recipe['id']; ?>"
                          <?php echo (isset($saved[$date][$meal]) && $saved[$date][$meal] == $recipe['id']) ? 'selected' : ''; ?>>
                          <?php echo htmlspecialchars($recipe['title']); ?>
                        </option>
                      <?php endforeach; ?>
                    </select>
                  </div>
                <?php endforeach; ?>
              </div>
            </div>
          <?php endforeach; ?>
        </div>

        <div class="modal-footer display-flex">
          <button type="submit" name="save_meal_plan" value="1" class="btn btn-pink btn-save">Save</button>
          <button type="submit" name="reset_meal_plan" value="1" class="btn btn-outline-danger btn-reset">Reset</button>
        </div>
      </form>

    </div>
  </div>
</div>

<!-- Display Saved Plan -->
<?php
$hasData = false;
foreach ($saved as $date => $mealsForDay) {
    foreach ($mealsForDay as $mealType => $recipeId) {
        if (!empty($recipeId)) {
            $hasData = true;
            break 2;
        }
    }
}
?>

<?php if ($hasData): ?>
  <div class="mt-5">
    <h3 class="text-pink fw-bold mb-4">📋 Your Saved Plan</h3>
    <div class="row row-cols-1 row-cols-md-3 g-4">
      <?php foreach ($days as $i => $day): 
          $date = (clone $monday)->modify("+$i days")->format('Y-m-d');
      ?>
        <div class="col">
          <div class="card meal-card h-100 shadow-sm border-0">
            <div class="card-body">
              <h5 class="card-title fw-bold text-pink"><?php echo $day; ?></h5>
              <ul class="list-unstyled">
                <?php foreach ($meals as $meal): ?>
                  <?php
                    $recipeId = $saved[$date][$meal] ?? null;
                    $recipeTitle = 'None';
                    $recipeLink = '#';
                    foreach ($recipes as $r) {
                        if ($r['id'] == $recipeId) {
                            $recipeTitle = $r['title'];
                            $recipeLink = "view-recipe.php?id=" . $r['id'];
                            break;
                        }
                    }
                  ?>
                  <li>
                    <strong><?php echo ucfirst($meal); ?>:</strong>
                    <?php if ($recipeId): ?>
                      <a href="<?php echo $recipeLink; ?>" class="link-pink text-decoration-none"><?php echo htmlspecialchars($recipeTitle); ?></a>
                    <?php else: ?>
                      None
                    <?php endif; ?>
                  </li>
                <?php endforeach; ?>
              </ul>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
<?php endif; ?>



<?php include("../includes/footer.php"); ?>
