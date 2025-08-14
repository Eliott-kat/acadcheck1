// Utilisé pour builder l'app Vite avant de lancer Electron
const { execSync } = require('child_process');

try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.error('Erreur lors du build Vite:', e);
  process.exit(1);
}

require('electron').app.whenReady().then(() => {
  require('./electron-main');
});
