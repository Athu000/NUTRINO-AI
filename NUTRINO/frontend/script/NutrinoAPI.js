import { auth, db } from "./auth.js";
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const API_BASE_URL = "https://nutrino-ai.onrender.com/api";

// ✅ Get or Refresh Firebase Auth Token
async function getAuthToken() {
    try {
        const user = auth.currentUser;
        if (user) {
            return await user.getIdToken(true);
        }
    } catch (error) {
        console.error("❌ Auth Token Error:", error);
        alert("Session expired. Please log in again.");
        window.location.href = "login.html";
    }
    return null;
}

// ✅ Fetch Recipe & Save to Firestore
async function fetchRecipe(prompt) {
    let authToken = await getAuthToken();
    if (!authToken) return;

    try {
        console.log("📤 Sending request to API:", API_BASE_URL);
        const response = await fetch(`${API_BASE_URL}/fetch-recipe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            console.error("❌ API Request Failed:", response.status, response.statusText);
            alert("Failed to fetch recipe. Try again.");
            return;
        }

        const data = await response.json();
        console.log("✅ API Response Received:", data);

        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            console.error("❌ API Response is malformed:", data);
            alert("Received an invalid recipe response.");
            return;
        }

        const recipeText = data.candidates[0].content.parts[0].text;
        console.log("✅ Extracted Recipe Text:", recipeText);

        // ✅ Save Recipe to Firestore
        const user = auth.currentUser;
        if (user) {
            await addDoc(collection(db, "recipes"), {
                userId: user.uid,
                recipe: recipeText,
                createdAt: new Date()
            });
            console.log("✅ Recipe saved to Firestore");

            // Redirect to the recipe display page after saving
            window.location.href = "generated_recipe.html";
        }
    } catch (error) {
        console.error("❌ API Error:", error);
        alert("Error fetching recipe. Try again.");
    }
}

// ✅ Display Recipe from Firestore
async function displayRecipe() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("❌ User not logged in.");
            return;
        }

        const recipesRef = collection(db, "recipes");
        const q = query(recipesRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("⚠️ No recipes found.");
            document.getElementById("recipe-title").textContent = "No recipes found.";
            return;
        }

        // Get the latest recipe
        const latestRecipe = querySnapshot.docs[querySnapshot.docs.length - 1].data().recipe;
        console.log("✅ Loaded Latest Recipe:", latestRecipe);

        document.getElementById("recipe-title").textContent = extractTitle(latestRecipe);
        document.getElementById("recipe-desc").textContent = "A delicious AI-generated recipe!";
        document.getElementById("recipe-calories").textContent = extractCalories(latestRecipe);
        document.getElementById("ingredients-list").innerHTML = extractSection(latestRecipe, "Ingredients");
        document.getElementById("instructions-list").innerHTML = extractSection(latestRecipe, "Instructions");
    } catch (error) {
        console.error("❌ Error displaying recipe:", error);
    }
}

window.addEventListener("DOMContentLoaded", displayRecipe);

// ✅ Extract Title
function extractTitle(text) {
    const match = text.match(/^##\s*(.+)/);
    return match ? match[1].trim() : "AI-Generated Recipe";
}

// ✅ Extract Calories Properly
function extractCalories(text) {
    const match = text.match(/Estimated Calories per Serving:\s*([\d-]+)/i);
    return match ? `${match[1]} kcal` : "N/A";
}

// ✅ Extract Ingredients or Instructions Properly
function extractSection(text, section) {
    const regex = new RegExp(`\\*\\*${section}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, "i");
    const match = text.match(regex);

    if (match) {
        return match[1]
            .trim()
            .split("\n")
            .filter(line => line.trim() !== "")
            .map(line => `<li>${line.replace(/^([*\-\d]+\.?)\s*/, "").trim()}</li>`)
            .join("");
    } else {
        return "<li>No data available.</li>";
    }
}
export { displayRecipe };

// ✅ Make function globally accessible
window.fetchRecipe = fetchRecipe;
