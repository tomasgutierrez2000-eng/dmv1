# Run the app locally

## Why you were getting 404 on port 5555

**Port 5555 was running a different app** (another Node/Next process), not this project. That’s why both `/` and `/visualizer` returned 404.

## Correct way to run

1. **Stop anything on the port you want to use** (e.g. 5555 or 3000):
   ```bash
   # Find and stop the process on port 5555 (macOS/Linux):
   lsof -ti :5555 | xargs kill -9
   ```
   Or close the terminal/tab where the other dev server was running.

2. **From this project folder (`120`), start the dev server:**
   ```bash
   cd /Users/tomas/120    # or your path to the 120 folder
   npm run dev
   ```
   Or use a fixed port:
   ```bash
   npm run dev:port       # runs on http://localhost:3000
   ```
   Or pick a port yourself:
   ```bash
   npx next dev -p 8765   # runs on http://localhost:8765
   ```

3. **Open the URL printed in the terminal** (e.g. `http://localhost:3000` or `http://localhost:8765`).
   - Home: `http://localhost:XXXX/`
   - Visualizer: `http://localhost:XXXX/visualizer`

If you still see 404, confirm you’re in the `120` directory when you run `npm run dev` and that you’re using the same port in the browser as in the terminal.
