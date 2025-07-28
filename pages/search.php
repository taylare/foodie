<?php include '../includes/header.php'; ?>
<h2>Search Recipes</h2>
<form id="search-form">
    <input type="text" id="search-query" placeholder="Search for a recipe...">
    <button type="submit">Search</button>
</form>
<div id="results"></div>
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
                results.innerHTML += `<div>
                    <img src="${recipe.image}" width="100">
                    <h3>${recipe.title}</h3>
                </div>`;
            });
        });
});
</script>
<?php include '../includes/footer.php'; ?>
