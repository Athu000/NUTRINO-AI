import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, setDoc, doc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyARqmUW_Upyh5IRllM0LEpfU9GqziM3Cqs",
  authDomain: "nutrino-ai.firebaseapp.com",
  projectId: "nutrino-ai",
  storageBucket: "nutrino-ai.firebasestorage.app",
  messagingSenderId: "1005323663654",
  appId: "1:1005323663654:web:3ecf92fde57fbc9c7da9e7"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// ✅ Google Sign-In Function
window.signInWithGoogle = async function () {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    localStorage.setItem("authToken", await user.getIdToken());
    localStorage.setItem("loggedInUser", JSON.stringify({ email: user.email, name: user.displayName }));

    // ✅ Store user details in Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: user.displayName,
      email: user.email,
      uid: user.uid,
      lastLogin: new Date()
    });

    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("❌ Google Sign-In Error:", error.message);
    alert("Google Sign-In failed. Please try again.");
  }
};

// ✅ Logout Function
window.logoutUser = function () {
  signOut(auth)
    .then(() => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("loggedInUser");
      window.location.href = "index.html"; // Redirect to homepage after logout
    })
    .catch(error => {
      console.error("❌ Logout Error:", error.message);
      alert("Logout failed. Please try again.");
    });
};

// ✅ Auto-Check User Login Status & Update UI
document.addEventListener("DOMContentLoaded", () => {
  const userEmailElement = document.getElementById("user-email");
  const authLinks = document.getElementById("auth-links");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (userEmailElement) userEmailElement.textContent = `Logged in as: ${user.email}`;
      if (authLinks) authLinks.style.display = "none";

      // ✅ If on generated_recipe.html, fetch and display recipe
      if (window.location.pathname.includes("generated_recipe.html")) {
        displayRecipeFromFirestore(user.uid);
      }
    } else {
      if (authLinks) authLinks.style.display = "block";
      if (userEmailElement) userEmailElement.textContent = "";
    }
  });
});

// ✅ Fetch and Display Recipe from Firestore
async function displayRecipeFromFirestore(userId) {
  try {
    const recipesRef = collection(db, "recipes");
    const q = query(recipesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error("❌ No recipes found in Firestore.");
      document.getElementById("recipe-title").textContent = "No recipes found!";
      return;
    }

    // Get the latest recipe
    let latestRecipe;
    querySnapshot.forEach((doc) => {
      latestRecipe = doc.data().content;
    });

    // Display recipe
    document.getElementById("recipe-container").innerHTML = formatRecipeHTML(latestRecipe);
    console.log("✅ Recipe fetched from Firestore:", latestRecipe);
  } catch (error) {
    console.error("❌ Firestore Fetch Error:", error);
  }
}

// ✅ Format Recipe for Display
function formatRecipeHTML(recipeText) {
  return recipeText.replace(/\n/g, "<br>"); // Convert new lines to HTML line breaks
}

// ✅ Export auth & db for other scripts
export { auth, db, provider };
