# Utilisation en mode application Windows (.exe)

1. Installez les dépendances Electron :
	```powershell
	npm install --save-dev electron
	```
2. Générez le build Vite :
	```powershell
	npm run build
	```
3. Lancez l'application Electron :
	```powershell
	npx electron .
	```
	(ou `npm run electron:dev` si vous utilisez le fichier electron-package.json)

Pour générer un vrai .exe installable, utilisez un packager comme electron-builder (optionnel).
# AcadCheck — Plagiarism & AI Detection

AcadCheck is a powerful web application that detects plagiarism and AI-written text with detailed reports.

## Features

- Plagiarism detection
- AI content detection
- Detailed analysis reports
- Document preview capabilities
- Multi-language support

## Technologies Used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Getting Started

### Prerequisites

Make sure you have Node.js installed on your machine. You can install it with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
```

2. Navigate to the project directory:
```sh
cd <YOUR_PROJECT_NAME>
```

3. Install the dependencies:
```sh
npm install
```

4. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`.

## Building for Production

To create a production build:

```sh
npm run build
```

## License

This project is private and proprietary.