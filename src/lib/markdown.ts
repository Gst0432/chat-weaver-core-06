// Utilitaire global pour le rendu markdown professionnel
export const renderMarkdown = (text: string): string => {
  return text
    // Headers - avec styles plus élégants
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold text-foreground mb-2 mt-3">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-foreground mb-2 mt-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-foreground mb-2 mt-3">$1</h1>')
    // Gras - style professionnel
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italique
    .replace(/\*(.*?)\*/g, '<em class="italic text-foreground/90">$1</em>')
    // Listes à puces
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc list-inside text-foreground/90 mb-1">$1</li>')
    // Listes numérotées
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal list-inside text-foreground/90 mb-1">$1</li>')
    // Code inline
    .replace(/`([^`]+)`/g, '<code class="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-xs font-mono border">$1</code>')
    // Liens
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>')
    // Sauts de ligne doubles pour paragraphes
    .replace(/\n\n/g, '</p><p class="mb-3 text-foreground/90">')
    // Sauts de ligne simples
    .replace(/\n/g, '<br/>');
};