const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

const CODE_DIR = path.join(__dirname, "code");

// Ensure the `code` directory exists
if (!fs.existsSync(CODE_DIR)) {
  fs.mkdirSync(CODE_DIR, { recursive: true });
}

app.post("/execute", (req, res) => {
  const { language, code } = req.body;

  // Language to filename mapping
  const fileMap = {
    cpp: "main.cpp",
    java: "Main.java",
    js: "main.js",
    python: "main.py",
  };

  if (!fileMap[language]) {
    return res.status(400).json({ error: "Invalid language selected!" });
  }

  const fileName = fileMap[language];
  const filePath = path.join(CODE_DIR, fileName);

  try {
    // Save the provided code into a file
    fs.writeFileSync(filePath, code, "utf8");

    // Docker service name
    const dockerService = `${language}_executor`;

    // Execute Docker Compose command
    exec(`docker-compose up --force-recreate ${dockerService}`, (error, stdout, stderr) => {
      let cleanOutput = stdout || "";
      let cleanError = stderr || "";

      // Remove ANSI escape sequences (like "\u001b[K")
      cleanOutput = cleanOutput.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");
      cleanError = cleanError.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");

      // Extract lines related to the specific container execution
      const regex = new RegExp(`^${dockerService}-\\d+\\s+\\|\\s*`, "i");
      cleanOutput = cleanOutput
        .split("\n")
        .filter((line) => regex.test(line))
        .map((line) => line.replace(regex, "").trim())
        .join("\n")
        .trim();

      cleanError = cleanError
        .split("\n")
        .filter((line) => regex.test(line))
        .map((line) => line.replace(regex, "").trim())
        .join("\n")
        .trim();

      if (error) {
        return res.status(500).json({ error: "Execution Error", details: cleanError || cleanOutput });
      }

      // Send the output (or error if any)
      res.json({ output: cleanOutput || "No output generated", error: cleanError || null });
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.listen(5000, () => console.log("Backend running on port 5000"));
