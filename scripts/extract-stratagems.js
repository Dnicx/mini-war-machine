import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect platform and set Python executable path
const isWindows = process.platform === 'win32';
const pythonExe = path.join(process.cwd(), isWindows ? 'venv/Scripts/python.exe' : 'venv/bin/python');

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const fullScriptPath = path.join(process.cwd(), scriptPath);
    const python = spawn(pythonExe, [fullScriptPath], {
      stdio: 'inherit'
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptPath} exited with code ${code}`));
      }
    });

    python.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('Extracting text from PDFs...');
    await runScript('scripts/extract-pdf.py');
    
    console.log('Parsing stratagems from extracted text...');
    await runScript('scripts/extract-stratagems.py');
    
    console.log('Stratagem extraction complete!');
  } catch (error) {
    console.error('Error during extraction:', error.message);
    process.exit(1);
  }
}

main();
