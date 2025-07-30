<?php include '../includes/header.php'; ?>

<div class="card p-4 shadow pastel-card">
  <h2 class="text-pink mb-4 text-center" style="text-decoration: underline;">Add Your Own Recipe</h2>
  <form method="POST" action="../api/saveRecipe.php" enctype="multipart/form-data" class="row g-3" id="recipeForm">

    <!-- New URL Input Field -->
    <div class="col-12">
      <label for="recipe_url" class="form-label fw-bold text-pink">(Optional) Paste Online Recipe URL</label>
      <div class="d-flex">
        <input type="text" id="recipe_url" class="form-control pastel-input me-2" placeholder="https://example.com/recipe">
        <button type="button" class="btn btn-submit" onclick="fetchRecipe()">Submit</button>
      </div>
    </div>

    <div class="col-12">
      <label for="title" class="form-label fw-bold text-pink">Recipe Title</label>
      <input type="text" name="title" id="title" class="form-control form-control-lg pastel-input" placeholder="e.g., Chocolate Pancakes" required>
    </div>

    <div class="col-md-6">
        <label class="form-label fw-bold text-pink">Ingredients</label>
        <div id="ingredient-fields">
            <div class="ingredient-group d-flex mb-2">
                <input type="text" name="ingredients[]" class="form-control pastel-input me-2" placeholder="e.g. 2 eggs" required>
                <button type="button" class="btn btn-outline-danger" onclick="removeIngredient(this)">✕</button>
            </div>
        </div>
        <button type="button" class="btn btn-outline-pink btn-sm" onclick="addIngredient()">+ Add Another Ingredient</button>
    </div>

    <div class="col-md-6">
      <label for="instructions" class="form-label fw-bold text-pink">Instructions</label>
      <textarea name="instructions" id="instructions" class="form-control pastel-input" rows="5" placeholder="Describe steps..." required></textarea>
    </div>

    <div class="col-md-6">
      <label for="image" class="form-label fw-bold text-pink">Upload Image</label>
      <input type="file" name="image" id="image" class="form-control pastel-input" accept="image/*">
    </div>

    <div class="col-md-6">
      <label for="image_url" class="form-label fw-bold text-pink">Or Paste Image URL</label>
      <input type="text" name="image_url" id="image_url" class="form-control pastel-input" placeholder="https://example.com/photo.jpg">
    </div>

    <div class="col-md-6">
      <label for="category" class="form-label fw-bold text-pink">Category</label>
      <select name="category" id="category" class="form-select pastel-input">
        <option value="Breakfast">Breakfast</option>
        <option value="Lunch">Lunch</option>
        <option value="Dinner">Dinner</option>
        <option value="Dessert">Dessert</option>
      </select>
    </div>

    <div class="col-md-6">
        <label for="servings" class="form-label fw-bold text-pink">Servings</label>
        <input type="number" name="servings" id="servings" class="form-control pastel-input" min="1" placeholder="e.g., 4" required>
    </div>


    <div class="col-12 text-end">
      <button type="submit" class="btn btn-pink btn-lg mt-3">Save Recipe</button>
    </div>
  </form>
</div>

<script>
function addIngredient() {
  const container = document.getElementById('ingredient-fields');
  const wrapper = document.createElement('div');
  wrapper.className = 'ingredient-group d-flex mb-2';

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'ingredients[]';
  input.className = 'form-control pastel-input me-2';
  input.placeholder = 'e.g. 1 tsp vanilla';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-outline-danger';
  removeBtn.textContent = '✕';
  removeBtn.onclick = function () {
    removeIngredient(removeBtn);
  };

  wrapper.appendChild(input);
  wrapper.appendChild(removeBtn);
  container.appendChild(wrapper);
}

function removeIngredient(button) {
  const group = button.closest('.ingredient-group');
  if (group) group.remove();
}

function fetchRecipe() {
  const url = document.getElementById('recipe_url').value;
  if (!url) return alert('Please paste a recipe URL.');

  fetch('../api/fetch-recipe.php?url=' + encodeURIComponent(url))
    .then(res => res.json())
    .then(data => {
      if (data.error) return alert(data.error);

      document.getElementById('title').value = data.title || '';

      // Fill instructions
      document.getElementById('instructions').value = data.instructions || '';

      // Clear old ingredients
      const ingredientFields = document.getElementById('ingredient-fields');
      ingredientFields.innerHTML = '';
      data.ingredients.forEach(ing => {
        const wrapper = document.createElement('div');
        wrapper.className = 'ingredient-group d-flex mb-2';

        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'ingredients[]';
        input.className = 'form-control pastel-input me-2';
        input.value = ing;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-outline-danger';
        removeBtn.textContent = '✕';
        removeBtn.onclick = function () {
          removeIngredient(removeBtn);
        };

        wrapper.appendChild(input);
        wrapper.appendChild(removeBtn);
        ingredientFields.appendChild(wrapper);
      });
    })
    .catch(err => {
      alert("Failed to fetch recipe.");
      console.error(err);
    });
}
</script>
<?php include "../includes/footer.php" ?>