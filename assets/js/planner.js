console.log("Planner JS loaded");
document.addEventListener("DOMContentLoaded", () => {
    const container = document.createElement('div');
    container.classList.add("planner-container");
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const meals = ["breakfast", "lunch", "dinner"];
    days.forEach(day => {
        const dayCol = document.createElement("div");
        dayCol.classList.add("planner-day");
        dayCol.innerHTML = `<h3>${day}</h3>`;
        meals.forEach(meal => {
            const select = document.createElement("select");
            select.innerHTML = `<option>${meal}</option><option disabled selected>--Select Recipe--</option>`;
            dayCol.appendChild(select);
        });
        container.appendChild(dayCol);
    });
    document.body.appendChild(container);
});
