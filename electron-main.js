const { app, BrowserWindow } = require('electron');
const path = require('path');


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  const htmlPath = path.join(__dirname, 'dist', 'index.html');
  console.log('Chargement du fichier HTML:', htmlPath);
  win.loadFile(htmlPath).catch((err) => {
    win.loadURL('data:text/html,<h2>Erreur : Impossible de charger l\'interface.<br>Vérifiez que le build Vite a bien généré dist/index.html.<br><pre>' + err + '</pre></h2>');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
