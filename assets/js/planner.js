console.log("Planner JS loaded");

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Fetching recipes...");

  // Fetch inside the async function
  const recipes = await fetch("../api/fetchUserRecipes.php")
    .then(res => res.json())
    .then(data => {
      console.log("Fetched recipes:", data);
      return data;
    })
    .catch(err => {
      console.error("Fetch error:", err);
      return [];
    });

      console.log("Fetched recipes:", recipes);

  const container = document.createElement("div");
  container.classList.add("container");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const meals = ["Breakfast", "Lunch", "Dinner"];

  days.forEach(day => {
    const row = document.createElement("div");
    row.className = "row mb-4";

    const dayCol = document.createElement("div");
    dayCol.className = "col-12";
    dayCol.innerHTML = `<h4 class="text-pink">${day}</h4>`;
    row.appendChild(dayCol);

    meals.forEach(meal => {
      const col = document.createElement("div");
      col.className = "col-md-4";

      const select = document.createElement("select");
      select.className = "form-select mb-2";
      select.innerHTML = `<option disabled selected>-- ${meal} --</option>`;

      recipes.forEach(recipe => {
        const option = document.createElement("option");
        option.value = recipe.id;
        option.textContent = recipe.title;
        select.appendChild(option);
      });

      col.appendChild(select);
      row.appendChild(col);
    });

    container.appendChild(row);
  });

  const target = document.querySelector("main") || document.body;
  target.appendChild(container);
});
