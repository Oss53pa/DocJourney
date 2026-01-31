import type { PackageData } from '../../types';
import { generateCSS } from './styles';
import { generateMarkup } from './markup';
import { generateScripts } from './scripts';

export function generateHTML(data: PackageData): string {
  const css = generateCSS();
  const markup = generateMarkup(data);
  const scripts = generateScripts(data);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DocJourney — ${data.document.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500&family=Grand+Hotel&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
${markup}
<script>${scripts}</script>
</body>
</html>`;
}
