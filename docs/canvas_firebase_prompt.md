# Prompt to give Gemini in a NEW canvas (to learn how Canvas does persistent storage)

Paste this as one message. Do not use it inside the GeminiForge canvas.

---
Create a minimal single-file React canvas app that proves persistent storage using Firebase Firestore, exactly the way you normally set it up in Canvas. Requirements:

1. Initialize Firebase using whatever mechanism Canvas provides for config, app id and authentication. Show on screen which global variables or values you used, and whether each one is defined.
2. Sign in (anonymous or with the provided token, whichever Canvas expects) and show the auth uid on screen.
3. A textarea and a Save button that writes the text to one Firestore document, plus a Load on page start that reads it back and shows it. Show the exact Firestore document path used.
4. Show any error message on screen in full.
5. Use no other libraries besides React and Firebase.

After generating it, print the complete code.
---

Then send me: (a) the complete code Gemini generated, (b) a screenshot after saving a text, and (c) a screenshot after reloading the page and after closing and reopening the canvas.
