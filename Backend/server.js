const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, FishCatch } = require('./database'); // Import User and FishCatch models from the database

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

// Create a new directory synchronously
const uploadFolderPath = path.join(__dirname, 'uploads');

try {
  fs.mkdirSync(uploadFolderPath, { recursive: true });
  console.log('Folder created successfully');
} catch (err) {
  console.error('Error creating folder:', err);
}

const app = express();

// Configure CORS to allow specific origins and methods
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['https://live-aquaria.onrender.com', 'http://localhost:5173'];
    // Allow requests with no origin (e.g., mobile apps or server-to-server requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // allowed HTTP methods
  credentials: true, // Include credentials like cookies
}));
// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));
// Parse JSON requests
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));
// Initialize the Google Generative AI client
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const geminiModelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const model = genAI ? genAI.getGenerativeModel({ model: geminiModelName }) : null;

if (!process.env.GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY. Fish identification will not work until it is configured.');
}

// Configure file upload storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolderPath)// Save files to the uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))// Append timestamp to filenames
  }
});

const upload = multer({ storage: storage });

// Signup route
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    // Hash the user's password and save the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully', username });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});


//login route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.status(200).json({ message: 'Login successful', username });
  }catch {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Helper function to prepare image data for AI processing
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

function isGeminiAuthError(error) {
  const errorText = `${error?.message || ''} ${error?.status || ''} ${error?.statusText || ''}`;
  return /api key|apikey|unauthorized|forbidden|permission|401|403/i.test(errorText);
}

function isGeminiModelError(error) {
  const errorText = `${error?.message || ''} ${error?.status || ''} ${error?.statusText || ''}`;
  return /model.*not found|not supported|404/i.test(errorText);
}

function isGeminiQuotaError(error) {
  const errorText = `${error?.message || ''} ${error?.status || ''} ${error?.statusText || ''}`;
  return /quota|too many requests|429/i.test(errorText);
}

function isGeminiTemporaryError(error) {
  const errorText = `${error?.message || ''} ${error?.status || ''} ${error?.statusText || ''}`;
  return /service unavailable|high demand|temporar|503/i.test(errorText);
}

// Fish identification route
app.post('/identify-fish', upload.single('image'), async (req, res) => {
  console.log('Received request body:', req.body);
// Validate image file
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const { username, latitude, longitude } = req.body;
  if (!username || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Username and location are required' });
  }

// Parse and validate latitude and longitude
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  console.log('Parsed latitude and longitude:', { lat, lon });

  if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
    return res.status(400).json({ error: 'Invalid latitude or longitude' });
  }

  const filePath = path.resolve(req.file.path);

  try {
    if (!model) {
      return res.status(500).json({
        error: 'Fish identification is not configured. Set GEMINI_API_KEY on the backend host.'
      });
    }

    // Prepare the image for AI analysis
    const imagePart = fileToGenerativePart(filePath, req.file.mimetype);
    // AI prompt for fish analysis 
    const prompt = `
      Analyze this image of a fish and provide the following information:
      1. Fish Name: Identify the species of the fish.
      2. Rarity Score: Rate the rarity of the fish on a scale from 1 to 10 in terms of fish native to Canada, where 1 is very common and 10 is extremely rare.
      3. Description: Provide a brief description of the fish.
      4. Location: Suggest a typical location where this fish might be found.
      5. Fish Story: Create a short, interesting story about catching this fish.
      6. Weight: Estimate the weight of the fish in grams.
      7. Length: Estimate the length of the fish in centimeters.
    `;
    // JSON schema definition 
    const jsonSchema = {
      type: "object",
      properties: {
        fishName: { type: "string" },
        rarityScore: { type: "number" },
        description: { type: "string" },
        location: { type: "string" },
        fishStory: { type: "string" },
        weight: { type: "number" },
        length: { type: "number" }
      },
      required: ["fishName", "rarityScore", "description", "location", "fishStory", "weight", "length"]
    };

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        { role: "user", parts: [imagePart] }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        topP: 1,
        topK: 32,
        responseMimeType: 'application/json',
        responseSchema: jsonSchema
      }
    });

    //console.log("Working");
    const response = await result.response;
    const fishInfo = JSON.parse(await response.text());

    console.log('AI generated fish info:', fishInfo);
    // Save fish catch to the database
    try {

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create a new FishCatch document
      const newFishCatch = new FishCatch({
        ...fishInfo,
        caughtBy: user._id,
        dateCaught: new Date(),
        latitude: lat,
        longitude: lon
      });

      console.log('New fish catch object:', newFishCatch);

      // Save the new fish catch
      await newFishCatch.save();

      // Initialize fishCatches array if it doesn't exist
      if (!user.fishCatches) {
        user.fishCatches = [];
      }

      // Add the reference to the user's fishCatches array
      user.fishCatches.push(newFishCatch._id);
      await user.save();

      res.json({
        ...fishInfo,
        latitude: lat,
        longitude: lon
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: 'An error occurred while updating the database.', details: dbError.message });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    let message = 'An error occurred while processing the image.';
    if (isGeminiAuthError(error)) {
      message = 'Fish identification API key is invalid or unauthorized. Update GEMINI_API_KEY on the backend host.';
    } else if (isGeminiModelError(error)) {
      message = 'Fish identification model is unavailable. Update GEMINI_MODEL on the backend host.';
    } else if (isGeminiQuotaError(error)) {
      message = 'Fish identification API quota is exhausted. Check Gemini API billing or rate limits.';
    } else if (isGeminiTemporaryError(error)) {
      message = 'Fish identification is temporarily unavailable because the Gemini model is busy. Please try again shortly.';
    }
    res.status(500).json({ error: message });
  } finally {
    // Clean up the uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
    });
  }
});

// Fetch all fish catches
app.get('/get-all-fish-catches', async (req, res) => {
  const { query, username } = req.query;

  const filter = {};

  if (query) {
    const parsedRarity = parseFloat(query);

    if (!isNaN(parsedRarity)) {
      filter.rarityScore = parsedRarity;
    } else {
      filter.fishName = { $regex: query, $options: 'i' };
    }
  }

  try {
    let fishCatches;
    if (username) {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      filter.caughtBy = user._id;
    }

    fishCatches = await FishCatch.find(filter).populate('caughtBy', 'username');

    // Transform the data to include the username and format the location
    const formattedFishCatches = fishCatches.map(fishCatch => {
      const catchObject = fishCatch.toObject();
      return {
        ...catchObject,
        username: catchObject.caughtBy ? catchObject.caughtBy.username : 'Unknown User',
        location: `${catchObject.latitude},${catchObject.longitude}`,
        caughtBy: undefined // Remove the caughtBy field to avoid sending unnecessary data
      };
    });

    res.json(formattedFishCatches);
  } catch (error) {
    console.error('Error fetching fish catches:', error);
    res.status(500).json({ error: 'An error occurred while fetching fish catches' });
  }
});



// Add this new route in your server.js file

app.get('/user-fish-catches', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fishCatches = await FishCatch.find({ caughtBy: user._id })
      .sort({ dateCaught: -1 }) // Sort by date, newest first
      .lean(); // Use lean() for better performance

    const formattedFishCatches = fishCatches.map(fishCatch => ({
      ...fishCatch,
      username: user.username,
      location: `${fishCatch.latitude},${fishCatch.longitude}`,
      caughtBy: undefined // Remove caughtBy to avoid sending unnecessary data
    }));

    res.json(formattedFishCatches);
  } catch (error) {
    console.error('Error fetching user fish catches:', error);
    res.status(500).json({ error: 'An error occurred while fetching user fish catches' });
  }
});


app.get('/recent-fish-catches', async (req, res) => {
  const { query } = req.query;

  const filter = {};

  if (query) {
    const parsedRarity = parseFloat(query);

    if (!isNaN(parsedRarity)) {
      filter.rarityScore = parsedRarity;
    } else {
      filter.fishName = { $regex: query, $options: 'i' };
    }
  }

  try {
    const recentCatches = await FishCatch.find(filter)
      .sort({ dateCaught: -1 })
      .limit(10)
      .populate('caughtBy', 'username')
      .select('-__v');

    res.json(recentCatches);
  } catch (error) {
    console.error('Error fetching recent catches:', error);
    res.status(500).json({ message: 'Error fetching recent catches', error: error.message });
  }
});

// Fetch fish details by ID
app.get('/fish-details/:id', async (req, res) => {
  try {
    const fishCatch = await FishCatch.findById(req.params.id).populate('caughtBy', 'username');
    if (!fishCatch) {
      return res.status(404).json({ error: 'Fish catch not found' });
    }
    res.json(fishCatch);
  } catch (error) {
    console.error('Error fetching fish details:', error);
    res.status(500).json({ error: 'An error occurred while fetching fish details' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
