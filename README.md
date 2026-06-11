# Live Aquaria: Redefining Fishing Memories

## Link 
https://live-aquaria.onrender.com/

## Overview
**Live Aquaria** is an innovative app that transforms the fishing experience by turning every catch into an interactive memory. With cutting-edge AI, Live Aquaria identifies fish species, logs vital stats, and displays your catches in a personalized, lifelike 3D virtual aquarium. It’s not just about fishing—it’s about preserving moments that last a lifetime.

---

## How It Works
Snap a picture of your catch, and Live Aquaria brings it to life. The app identifies the species, provides rarity ratings, logs the location and date, and saves it all in a stunning virtual aquarium. You can interact with your aquarium, view detailed fish stats.

---

## Why Live Aquaria?
Many fishing enthusiasts lack a meaningful way to document their catches beyond simple photos. Live Aquaria fills this gap by creating an immersive digital record of each catch, allowing anglers to revisit their adventures.

---

## Key Features
- **AI Fish Identification**: Instantly identify fish species from a photo.
- **Rarity Ratings**: Discover how unique your catch is.
- **Catch Tracking**: Log when and where each fish was caught.
- **Virtual Aquarium**: Display your catches in a 3D aquarium.
- **Global Fishing Map**: Explore catches from around the world and plan your next adventure.

---

## Technology Behind Live Aquaria
- **Frontend**: Powered by React and Three.js for an engaging user experience.
- **Backend**: Node.js and Express handle the app’s functionality.
- **Database**: MongoDB Atlas ensures robust and secure data storage.
- **AI**: Leveraging Google’s Gemini API for fish recognition and storytelling.
- **Mapping**: Integrates the Leaflet API for detailed geolocation features.

---

## Getting Started

1. Clone the repository:
   ```
   git clone [repository URL]
   ```

2. Install backend dependencies:
   ```
   cd Backend
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd ../Frontend
   npm install
   ```

## Environment Variables

Create `Backend/.env.local` for local development, or set these directly in the hosted service environment:

```
MONGO_CONNECTION=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

On Render, add/update `GEMINI_API_KEY` in the service's Environment tab and redeploy the backend. `GEMINI_MODEL` is optional; the backend defaults to `gemini-2.5-flash`. Do not commit real API keys.

## Running the Application

1. Start the backend server:
   ```
   cd Backend
   node server.js
   ```

2. In a new terminal, start the frontend:
   ```
   cd Frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Screenshots

<img width="1440" alt="Login or Sign in page" src="Project photos/Screenshot 2024-12-06 210032.png">

<img width="1440" alt="Dashboard where main aquarium is" src="Project photos/Screenshot 2024-12-06 210542.png">

<img width="1440" alt="Map" src="Project photos/Screenshot 2024-12-06 210441.png">


## Contributors
- Manav Chaudhary 
- Jainam Patel 
- Juan David 
- Rishi Goyal 
- Ripu Singh 

---
