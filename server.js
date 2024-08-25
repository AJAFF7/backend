const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("build"));

let backupProgress = 0;
let backupDone = false;

app.post('/backup', (req, res) => {
  const { sourcePath, destinationPath } = req.body;

  if (!sourcePath || !destinationPath) {
    return res.status(400).json({ error: 'Source and destination paths are required' });
  }

  // Resolve and validate paths
  const resolvedSourcePath = path.resolve(sourcePath);
  const resolvedDestinationPath = path.resolve(destinationPath);

  // Check if sourcePath is a valid directory on the server
  if (!fs.existsSync(resolvedSourcePath) || !fs.statSync(resolvedSourcePath).isDirectory()) {
    return res.status(400).json({ error: `Source directory ${resolvedSourcePath} does not exist or is not a directory` });
  }

  // Check if destinationPath exists, create if necessary
  if (!fs.existsSync(resolvedDestinationPath)) {
    fs.mkdirSync(resolvedDestinationPath, { recursive: true });
  } else if (!fs.statSync(resolvedDestinationPath).isDirectory()) {
    return res.status(400).json({ error: `Destination path ${resolvedDestinationPath} is not a directory` });
  }

  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '');
  const backupFile = path.join(resolvedDestinationPath, `backup-${timestamp}.tar.gz`);
  const backupCommand = `tar -czf ${backupFile} -C ${resolvedSourcePath} .`;

  exec(backupCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${stderr}`);
      return res.status(500).json({ error: `Backup failed: ${stderr}` });
    }

    backupProgress = 0;
    backupDone = false;
    simulateProgress(); // Simulate progress

    res.json({ message: 'Backup started successfully!', backupFile });
  });
});

app.get('/progress', (req, res) => {
  console.log('Progress endpoint hit');
  res.json({ progress: backupProgress, done: backupDone });
});

const simulateProgress = () => {
  const intervalId = setInterval(() => {
    if (backupProgress < 100) {
      backupProgress += 10;
    } else {
      backupDone = true;
      clearInterval(intervalId);
    }
  }, 1000); // Increment progress every second
};

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Handle other errors
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

