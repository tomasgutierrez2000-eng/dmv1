# Run the app on localhost

## 1. Open Terminal in the project folder

The project folder is the one that contains `package.json` and `.env`.  
Example: `cd /Users/tomas/120`

## 2. Start the dev server

```bash
npm run dev
```

Wait until you see something like:

- `Local: http://localhost:3000`  
  or  
- `Port 3000 is in use, trying 3001 instead` then `Local: http://localhost:3001`

**Use the URL shown** (the port can be 3000, 3001, 3002, etc.).

## 3. Open that URL in your browser

- Home: `http://localhost:3000` (or your port)
- Agent (ask the data model): `http://localhost:3000/agent`

If the terminal said port 3001, use `http://localhost:3001` and `http://localhost:3001/agent` instead.

## 4. If the agent says "API key not set"

- Confirm `.env` is in the **same folder** as `package.json`.
- The file should contain one line: `GOOGLE_GEMINI_API_KEY=your_key`
- Stop the server (Ctrl+C), run `npm run dev` again, then refresh the page.

## 5. If nothing loads in the browser

- Check the terminal for errors.
- Try another port: `npm run dev:3001` or `npm run dev:3002`, then open the URL with that port.
- Make sure you’re opening the exact URL from the terminal (correct port).
