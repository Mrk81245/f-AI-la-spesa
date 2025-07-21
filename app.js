
let listaSpesa = JSON.parse(localStorage.getItem("listaSpesa")) || [];
let suggerimenti = JSON.parse(localStorage.getItem("suggerimenti")) || {};
const itemInput = document.getElementById("itemInput");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const itemList = document.getElementById("itemList");
const suggestionsBox = document.getElementById("suggestionsBox");

const recipeInput = document.getElementById("recipeInput");
const searchRecipeBtn = document.getElementById("searchRecipeBtn");
const recipeResults = document.getElementById("recipeResults");

function salvaLista() {
  localStorage.setItem("listaSpesa", JSON.stringify(listaSpesa));
  localStorage.setItem("suggerimenti", JSON.stringify(suggerimenti));
}

function renderLista() {
  itemList.innerHTML = "";
  listaSpesa.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.addEventListener("click", () => {
      listaSpesa.splice(index, 1);
      renderLista();
      salvaLista();
    });
    itemList.appendChild(li);
  });
}

function renderSuggerimenti(input) {
  suggestionsBox.innerHTML = "";
  const parole = Object.entries(suggerimenti)
    .filter(([chiave]) => chiave.toLowerCase().startsWith(input.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .map(([chiave]) => chiave);
  parole.forEach(p => {
    const div = document.createElement("div");
    div.textContent = p;
    div.className = "suggestion-item";
    div.addEventListener("click", () => {
      itemInput.value = p;
      suggestionsBox.innerHTML = "";
    });
    suggestionsBox.appendChild(div);
  });
}

addBtn.addEventListener("click", () => {
  const nuovo = itemInput.value.trim();
  if (nuovo && !listaSpesa.includes(nuovo)) {
    listaSpesa.push(nuovo);
    suggerimenti[nuovo] = (suggerimenti[nuovo] || 0) + 1;
    salvaLista();
    renderLista();
  }
  itemInput.value = "";
  suggestionsBox.innerHTML = "";
});

clearBtn.addEventListener("click", () => {
  if (confirm("Sei sicuro di voler svuotare tutto?")) {
    listaSpesa = [];
    suggerimenti = {};
    localStorage.clear();
    renderLista();
    suggestionsBox.innerHTML = "";
  }
});

itemInput.addEventListener("input", () => {
  renderSuggerimenti(itemInput.value);
});

searchRecipeBtn.addEventListener("click", async () => {
    const ricerca = recipeInput.value.trim();
    if (!ricerca) {
        alert("Per favore, inserisci il nome di una ricetta.");
        return;
    }
    recipeResults.innerHTML = "<p>Ricerca della ricetta in corso...</p>";

    try {
        const prompt = `Fornisci una ricetta per "${ricerca}". Rispondi ESCLUSIVAMENTE con un oggetto JSON che abbia la seguente struttura: { "nomeRicetta": "Nome della Ricetta", "persone": 4, "ingredienti": ["quantità unità nome", "quantità unità nome"] }. Esempio: { "nomeRicetta": "Spaghetti alla Carbonara", "persone": 4, "ingredienti": ["400 g spaghetti", "150 g guanciale", "4 tuorli d’uovo", "50 g pecorino romano", "pepe nero q.b."] }.`;
        
        const response = await fetch('/api/recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`Errore dalla API di OpenAI: ${response.statusText}`);
        }

        const data = await response.json();
        const recipeText = data.choices[0].message.content;
        const recipe = JSON.parse(recipeText.trim());

        displayRecipe(recipe);

    } catch (error) {
        console.error("Errore durante la ricerca della ricetta:", error);
        recipeResults.innerHTML = `<p>Si è verificato un errore. Controlla la console per i dettagli. Assicurati che la chiave API sia corretta, abbia credito residuo e che il modello AI abbia risposto con un JSON valido.</p>`;
    }
});

function displayRecipe(recipe) {
    recipeResults.innerHTML = "";

    const div = document.createElement("div");
    div.className = "ricetta-trovata";

    const titolo = document.createElement("h3");
    titolo.textContent = recipe.nomeRicetta;
    div.appendChild(titolo);

    const personeInfo = document.createElement("p");
    personeInfo.textContent = `Ricetta originale per ${recipe.persone} persone.`;
    div.appendChild(personeInfo);

    const scaleDiv = document.createElement("div");
    scaleDiv.className = "input-group";
    
    const personInput = document.createElement("input");
    personInput.type = "number";
    personInput.id = "personInput";
    personInput.placeholder = "Per quante persone?";
    personInput.min = "1";
    scaleDiv.appendChild(personInput);

    const recalculateBtn = document.createElement("button");
    recalculateBtn.textContent = "Ricalcola Dosi";
    scaleDiv.appendChild(recalculateBtn);
    
    div.appendChild(scaleDiv);

    const ingredientListContainer = document.createElement("div");
    div.appendChild(ingredientListContainer);

    recalculateBtn.addEventListener("click", () => {
        const newPeople = parseInt(personInput.value);
        if (!newPeople || newPeople <= 0) {
            alert("Inserisci un numero di persone valido.");
            return;
        }
        const scalingFactor = newPeople / recipe.persone;
        const scaledIngredients = recipe.ingredienti.map(ing => {
            const match = ing.match(/^(\d+\.?\d*|\d+)/);
            if (match) {
                const quantity = parseFloat(match[0]);
                const newQuantity = quantity * scalingFactor;
                // Arrotonda a 1 decimale se non è un intero
                const finalQuantity = newQuantity % 1 === 0 ? newQuantity : newQuantity.toFixed(1);
                return ing.replace(match[0], finalQuantity);
            }
            return ing; // Lascia invariati ingredienti come "sale q.b."
        });
        renderIngredients(scaledIngredients, ingredientListContainer, recipe.nomeRicetta);
    });

    // Mostra la lista originale all'inizio
    renderIngredients(recipe.ingredienti, ingredientListContainer, recipe.nomeRicetta);

    recipeResults.appendChild(div);
}

function renderIngredients(ingredients, container, recipeName) {
    container.innerHTML = ""; 

    const lista = document.createElement("ul");
    ingredients.forEach(ing => {
        const li = document.createElement("li");
        li.textContent = ing;
        lista.appendChild(li);
    });
    container.appendChild(lista);

    const btn = document.createElement("button");
    btn.textContent = "Aggiungi ingredienti alla lista";
    btn.addEventListener("click", () => {
        ingredients.forEach(ing => {
            if (!listaSpesa.includes(ing)) {
                listaSpesa.push(ing);
                suggerimenti[ing] = (suggerimenti[ing] || 0) + 1;
            }
        });
        salvaLista();
        renderLista();
        alert(`Ingredienti per "${recipeName}" aggiunti alla lista!`);
    });
    container.appendChild(btn);
}


function showTab(tab) {
  document.getElementById("listTab").classList.add("hidden");
  document.getElementById("listTab").classList.remove("active");
  document.getElementById("recipesTab").classList.add("hidden");
  document.getElementById("recipesTab").classList.remove("active");

  document.getElementById(tab + "Tab").classList.remove("hidden");
  document.getElementById(tab + "Tab").classList.add("active");
}

document.getElementById("themeSelector").addEventListener("change", e => {
  document.body.className = "";
  document.body.classList.add("theme-" + e.target.value);
});

renderLista();
