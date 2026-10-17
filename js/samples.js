// A few starter recipes so a brand-new app isn't empty.
export const SAMPLES = [
  {
    title: 'Fluffy Chocolate Pancakes',
    category: 'Breakfast', tags: ['sweet', 'weekend'],
    prepMin: 10, cookMin: 15, servings: 4, favorite: true, rating: 5,
    ingredients: [
      '1 1/2 cups plain flour', '3 tbsp cocoa powder', '2 tbsp sugar', '2 tsp baking powder',
      '1/4 tsp salt', '1 1/4 cups milk', '1 egg', '3 tbsp butter, melted', '1/2 cup chocolate chips'
    ],
    steps: [
      'Whisk the flour, cocoa, sugar, baking powder and salt together in a big bowl.',
      'In a jug, whisk the milk, egg and melted butter.',
      'Pour the wet into the dry and stir until just combined – a few lumps are fine. Fold through the chocolate chips.',
      'Rest the batter for 5 minutes while a non-stick pan heats over medium heat.',
      'Cook 1/4 cup of batter at a time for 2 minutes, until bubbles appear, then flip and cook 1 minute more.',
      'Serve stacked with berries and maple syrup.'
    ],
    notes: 'Swap the chocolate chips for banana slices for a less sweet version.'
  },
  {
    title: 'Creamy Tomato Pasta',
    category: 'Dinner', tags: ['vegetarian', 'quick'],
    prepMin: 5, cookMin: 20, servings: 2, rating: 4,
    ingredients: [
      '200 g spaghetti', '1 tbsp olive oil', '2 cloves garlic, minced', '1 onion, finely diced',
      '400 g canned crushed tomatoes', '1/2 cup cream', '1/2 tsp chilli flakes', '1/3 cup parmesan, grated',
      'Handful fresh basil', 'Salt and pepper, to taste'
    ],
    steps: [
      'Cook the spaghetti in salted boiling water for 10 minutes, or until al dente. Save a mug of pasta water.',
      'Meanwhile, heat the oil in a pan and cook the onion for 5 minutes until soft. Add garlic and chilli for 1 minute.',
      'Add the tomatoes and simmer for 8 minutes. Stir in the cream and parmesan.',
      'Toss the pasta through the sauce with a splash of pasta water until glossy.',
      'Season, tear over the basil and serve.'
    ]
  },
  {
    title: 'Chicken & Avocado Wraps',
    category: 'Lunch', tags: ['quick', 'high protein'],
    prepMin: 10, cookMin: 10, servings: 2, favorite: true,
    ingredients: [
      '2 chicken breasts', '1 tsp smoked paprika', '1 tbsp olive oil', '4 tortillas', '1 avocado, sliced',
      '1 cup lettuce, shredded', '1 tomato, diced', '2 tbsp Greek yoghurt', '1 lime'
    ],
    steps: [
      'Rub the chicken with paprika, oil and a pinch of salt.',
      'Pan-fry over medium-high heat for 5 minutes each side until cooked through. Rest for 3 minutes, then slice.',
      'Mix the yoghurt with a squeeze of lime.',
      'Fill the tortillas with lettuce, tomato, avocado and chicken. Drizzle with the lime yoghurt and roll up.'
    ]
  },
  {
    title: 'Strawberry Yoghurt Bark',
    category: 'Snack', tags: ['make ahead', 'no bake'],
    prepMin: 10, cookMin: 0, servings: 6,
    ingredients: ['2 cups Greek yoghurt', '2 tbsp honey', '1 cup strawberries, sliced', '1/4 cup granola', '2 tbsp dark chocolate, chopped'],
    steps: [
      'Line a tray with baking paper.',
      'Stir the honey through the yoghurt and spread it 1cm thick on the tray.',
      'Scatter over the strawberries, granola and chocolate.',
      'Freeze for 2 hours until firm, then snap into pieces. Keep in the freezer.'
    ]
  }
];
