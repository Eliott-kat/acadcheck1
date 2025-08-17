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
  const htmlPath = path.join(__dirname, 'index.html');
  const url = 'file://' + htmlPath.replace(/\\/g, '/');
  console.log('Chargement du fichier HTML:', url);
  win.loadURL(url).catch((err) => {
    win.loadURL('data:text/html,<h2>Erreur : Impossible de charger l\'interface.<br>Vérifiez que le build Vite a bien généré index.html à la racine du package.<br><pre>' + err + '</pre></h2>');
  });
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
