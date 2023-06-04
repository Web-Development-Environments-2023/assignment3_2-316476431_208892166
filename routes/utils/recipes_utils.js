const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";



/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */


async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

async function getRandomRecipeInformation(num) {
    return await axios.get(`${api_domain}/random`, {
        params: {
            number: num,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

async function getSearchRecipeInformation(params) {
    params.apiKey = process.env.spooncular_apiKey;
    return await axios.get(`${api_domain}/complexSearch`, {params});
}

async function getFullRecipeDetails(recipe_id) {
    let recipe_info = await getRecipeInformation(recipe_id);
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree, servings, analyzedInstructions, extendedIngredients } = recipe_info.data;
    let {Instructions_steps, required_equipment} = extractInstructionsAndEquipment(analyzedInstructions);
    let ingredients_details = extractIngredients(extendedIngredients);
    return {
        id: id,
        title: title,
        readyInMinutes: readyInMinutes,
        image: image,
        popularity: aggregateLikes,
        vegan: vegan,
        vegetarian: vegetarian,
        glutenFree: glutenFree,
        numberOfPortions: servings,
        instructions: Instructions_steps,
        equipment: required_equipment,
        ingredients: ingredients_details
        
    }
}

async function getRandomRecipeDetails(number) {
    let recipe_info = await getRandomRecipeInformation(number);
    console.log('The recipe info: ', recipe_info)
    recipes = [];
    for (let i = 0; i < number; i++) {
        let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree } = recipe_info.data.recipes[i];
        recipes.push({
            id,
            title,
            readyInMinutes,
            image,
            aggregateLikes,
            vegan,
            vegetarian,
            glutenFree
          });
    } 
    return recipes;
}

async function getSearchRecipeDetails(params, numberOfResults) {
    let recipe_info = await getSearchRecipeInformation(params);
    let recipes = [];
    let results = recipe_info.data.results.length;
    if(numberOfResults > results){

        if(results >= 10)
            numberOfResults = 10;
        else if(results >= 5)
            numberOfResults = 5;
        else
            numberOfResults = results;
    }

    for (let i = 0; i < numberOfResults; i++){
        let recipeId = recipe_info.data.results[i].id;
        let recipe = await getRecipeInformation(recipeId);
        let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree, analyzedInstructions} = recipe.data;
        let {Instructions_steps, required_equipment} = extractInstructionsAndEquipment(analyzedInstructions);
        recipes.push({
            id: id,
            title: title,
            readyInMinutes: readyInMinutes,
            image: image,
            popularity: aggregateLikes,
            vegan: vegan,
            vegetarian: vegetarian,
            glutenFree: glutenFree,
            instructions: Instructions_steps,
            //equipment: required_equipment
        });

    }
    return recipes;
}


async function getRecipeDetails(recipe_id) {
    let recipe_info = await getRecipeInformation(recipe_id);
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree } = recipe_info.data;

    return {
        id: id,
        title: title,
        readyInMinutes: readyInMinutes,
        image: image,
        popularity: aggregateLikes,
        vegan: vegan,
        vegetarian: vegetarian,
        glutenFree: glutenFree
    }
}

async function getRecipesDetails(recipes_id_list){
    let recipes_preview = [];
    for(let i=0; i<recipes_id_list.length; i++){
        let recipe_info = await getRecipeDetails(recipes_id_list[i]);
        console.log(recipe_info)
        recipes_preview.push(recipe_info);
    }
    return recipes_preview;
}

function extractInstructionsAndEquipment(Instructions){
    let Instructions_steps = [];
    let equipment = {};
    Instructions[0].steps.forEach(stepNumber => {

        Instructions_steps.push(stepNumber.step);
        stepNumber.equipment.forEach(item => {
            equipment[item.name] = true;
        });
    });
    let required_equipment = Object.keys(equipment);
    return { Instructions_steps,  required_equipment};
}

function extractIngredients(ingredients){
    ingredients_details = [];
    ingredients.forEach(ingredient => {
        ingredients_details.push({
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        description: ingredient.original
    });
    });
    return ingredients_details;
}

exports.getRecipeInformation = getRecipeInformation;
exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesDetails = getRecipesDetails;
exports.getFullRecipeDetails = getFullRecipeDetails;
exports.getRandomRecipeDetails = getRandomRecipeDetails;
exports.getSearchRecipeDetails = getSearchRecipeDetails;



