var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");
const e = require("express");
const { Time } = require("mssql");

/**
 * Authenticate all incoming requests by middleware
 */
router.use(async function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT user_id FROM users").then((users) => {
      if (users.find((x) => x.user_id === req.session.user_id)) {
        req.user_id = req.session.user_id;
        next();
      }
    }).catch(err => next(err));
  } else {
    res.sendStatus(401);
  }
});

/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user
 */
router.post('/favorites', async (req,res,next) => { 
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await recipe_utils.getRecipeInformation(recipe_id).catch(error => { // check if recipe id exist on spoon
      if (error.response && error.response.status === 404) 
        throw { status: 404, message: `A recipe with the id ${recipe_id} does not exist.` };
      else 
        throw error;
    }); 
    const result = await DButils.execQuery(`SELECT * FROM favoriterecipes WHERE user_id = '${user_id}' AND recipe_id = ${recipe_id}`);
    if(result.length > 0)
      throw { status: 400, message: `A recipe with the id ${recipe_id} already saved as favorite for ${user_id}.` };

    await user_utils.markAsFavorite(user_id,recipe_id);
    res.status(200).send("The Recipe successfully saved as favorite");
    } catch(error){
    next(error);
  }
})

/*
=======

/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */
router.get('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    // let favorite_recipes = {};
    const recipes_id = await user_utils.getFavoriteRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesDetails(recipes_id_array);
    for (let recipe of results) {
      recipe.viewed = await user_utils.checkIfViewed(req.session.user_id, recipe.id);
      recipe.favorite = true;
    }
    res.status(200).send(results);
  } catch(error){
    next(error); 
  }
});
/*
Deletes From user's favorites
*/
router.delete('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await user_utils.deleteUserFavorite(user_id, recipe_id);
    res.status(200).send("The Recipe successfully deleted from user's favorites");
  } catch(error){
    next(error); 
  }
});

/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user
 */
router.post('/last-view', async (req,res,next) => {

  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await recipe_utils.getRecipeInformation(recipe_id).catch(error => { // check if recipe id exist on spoon
      if (error.response && error.response.status === 404) 
        throw { status: 404, message: `A recipe with the id ${recipe_id} does not exist.` };
      else 
        throw error;
    }); 
    const result = await DButils.execQuery(`SELECT * FROM lastviewed WHERE user_id = '${user_id}' AND recipe_id = ${recipe_id}`);

    /*
    The user viewed this page and needed to refresh
    */
    if(result.length > 0){
      await user_utils.deleteLastViewed(user_id, recipe_id)
    }

    await user_utils.addLastViewed(user_id, recipe_id)

    res.status(200).send("The Recipe successfully saved to last-viewed");
    } catch(error){
    next(error);
  }
})
/*
Gets user's last viewed by number of viewes or defualt 3
*/
router.get('/last-view', async (req,res,next) => {
  try{
    const number = req.body.number || 3;
    const user_id = req.session.user_id;
    const recipes_id = await user_utils.getLastViewed(user_id, number);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesDetails(recipes_id_array);
    for (let recipe of results) {
      recipe.viewed = true;
      recipe.favorite = await user_utils.checkIfFavorite(req.session.user_id, recipe.id);
    }
    res.status(200).send(results);
  } catch(error){
    next(error); 
  }
});
/*
Add user's last view
*/
router.post("/my-recipes", async (req, res, next) => {
  try {
    console.log(req.body)
    // parameters exists
    // valid parameters
    // username exists
    // no need to check validation of the details on server side.
    let recipe_details = {
      picture: req.body.image,
      name: req.body.title,
      time: req.body.readyInMinutes,
      popularity: '0',
      vegan: req.body.vegan,
      glutenFree: req.body.glutenFree,
      viewed: req.body.viewed,
      favorite: req.body.favorite,
      ingredients: req.body.ingredients,
      instructions: req.body.instructions,
      numberOfPortions: req.body.numberOfPortions,
      equipments: req.body.equipment,
      summary: req.body.summary,
    }

    const user_id = req.session.user_id;
    
    recipe_details.vegan = req.body.vegan ? 1 : 0;
    recipe_details.glutenFree = req.body.glutenFree ? 1 : 0;

    const count = (await DButils.execQuery(`SELECT COUNT(*) AS count FROM myrecipes WHERE user_id = '${req.session.user_id}';`)); 
    const recipe_id = parseInt(count[0].count) + 1;
    console.log("Recipe details before going in: ", recipe_details)

    console.log("Recipe ID after SQL: ", recipe_id)
    await user_utils.addUserRecipe(user_id, recipe_id, recipe_details.name, recipe_details.picture,
    recipe_details.time, recipe_details.popularity, recipe_details.vegan, 
    recipe_details.glutenFree, recipe_details.numberOfPortions, recipe_details.summary)
    
    // Add all the ingredients to the ingredients table
    for (var i = 0; i < recipe_details.ingredients.length; i++) {
      var ingredient = recipe_details.ingredients[i];
      
      var name = ingredient.name;
      var amount = ingredient.amount;
      var unit = ingredient.unit;
      var description = ingredient.description;
      
      await user_utils.addIngredients(user_id, recipe_id, i+1, name, amount, unit, description)
    }

    console.log(recipe_details.instructions)

    // Add all the instructions
    for (var i = 0; i < recipe_details.instructions.length; i++) {
      var instruction = recipe_details.instructions[i]
        
      await user_utils.addInstrucitons(user_id, recipe_id, i+1, instruction)
    }
    
    console.log(recipe_details.equipments)

    // Add all the equipments
    for (var i = 0; i < recipe_details.equipments.length; i++) {
      var equipment = recipe_details.equipments[i]
      
      console.log("equipment:", equipment);
  
      await user_utils.addEquipments(user_id, recipe_id, i+1, equipment)
    }

    res.status(201).send({ message: "Recipe has been added", success: true });
  } catch (error) {
    next(error);
  }
});
/*
Get user's own recipes
*/
router.get('/my-recipes', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const results = await user_utils.getUserRecipes(user_id);
    res.status(200).send(results);
    console.log(results)
  } catch(error){
    next(error); 
  }
});
/*
Get user's Specific Recipe
*/
router.get('/my-recipes/:recipeId', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.params.recipeId;
    const result = await user_utils.getUserSpecificRecipe(user_id, recipe_id);
    res.status(200).send(result);
    console.log(result)
  } catch(error){
    next(error); 
  }
});
/*
Delete user's own recipes
*/
router.delete('/my-recipes', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await user_utils.deleteUserRecipe(user_id, recipe_id);
    res.status(200).send("The Recipe successfully deleted from user's recieps");
  } catch(error){
    next(error); 
  }
});

module.exports = router;
