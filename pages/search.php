<?php include '../includes/header.php'; ?>
<h2 class="mb-4 text-center">Search Recipes</h2>
<form id="search-form" class="d-flex justify-content-center mb-5">
  <input type="text" id="search-query" class="form-control w-50 me-2" placeholder="Search for a recipe..." />
  <button type="submit" class="btn btn-pink">Search</button>
</form>
<div id="results" class="row justify-content-center"></div>

<script>
document.getElementById('search-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const query = document.getElementById('search-query').value;
  fetch(`../api/searchRecipes.php?q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      const results = document.getElementById('results');
      results.innerHTML = '';
      data.results.forEach(recipe => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
          <div class="card mb-3 p-2" style="min-height: 300px;">
            <img src="${recipe.image}" class="card-img-top" alt="${recipe.title}" />
            <div class="card-body">
              <h5 class="card-title">${recipe.title}</h5>
            </div>
          </div>`;
        results.appendChild(col);
      });
    });
});
</script>

<?php include '../includes/footer.php'; ?>
