# AI Story Generation Setup

Follow these steps to enable automatic AI story generation:

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## Step 2: Set Up Environment File

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the template file:
   ```bash
   cp env.template .env
   ```

3. Edit the `.env` file:
   ```bash
   nano .env  # or use any text editor
   ```

4. Replace the placeholder with your actual API key:
   ```
   GEMINI_API_KEY=AIzaSyYourActualAPIKeyHere
   ```

5. Save and close the file

## Step 3: Install Dependencies

```bash
# From the backend directory
npm install
```

## Step 4: Start the Server

```bash
# From the project root
npm run dev
```

## What You'll See

When everything is set up correctly, you'll see:

```
🚀 Server running on port 5000
👀 Setting up story file watcher...
✅ Story watcher is ready and monitoring for new stories  
🤖 AI Story generation enabled with Gemini API
🔍 Checking existing stories for missing generated content...
```

## Testing

1. Create a new story using the web interface
2. Check the console logs to see AI generation in progress
3. Look at the generated JSON file to see the complete story with scenes

## Troubleshooting

- **"GEMINI_API_KEY not set"**: Make sure your .env file exists and contains your API key
- **API errors**: Check that your API key is valid and hasn't expired
- **Generation fails**: Check your internet connection and API quotas

## File Structure

```
backend/
├── env.template    # Template file (safe to commit)
├── .env           # Your actual API key (ignored by git)
└── server.js      # Main server file
```

The `.env` file is automatically ignored by git to keep your API key private.
