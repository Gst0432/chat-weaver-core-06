import { supabase } from '@/integrations/supabase/client';
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { OpenRouterService } from './openRouterService';

export interface DocumentGenerationOptions {
  content: string;
  type: 'pdf' | 'docx' | 'pptx' | 'markdown' | 'html' | 'xlsx';
  template?: 'report' | 'presentation' | 'letter' | 'resume' | 'contract';
  enhanceWithAI?: boolean;
  model?: string; // OpenRouter model pour amélioration IA
  title?: string;
  author?: string;
  coverImageUrl?: string;
}

/**
 * Service de génération de documents avancé avec OpenRouter
 * Support PDF, DOCX, PPTX, Markdown, HTML, Excel
 */
export class DocumentGeneratorService {

  /**
   * Génère un document avec amélioration IA optionnelle
   */
  static async generateDocument(options: DocumentGenerationOptions): Promise<string> {
    let { content, type, template, enhanceWithAI = false, model = 'anthropic/claude-3.5-sonnet', title, author, coverImageUrl } = options;

    console.log('📄 Génération document:', { type, template, enhanceWithAI });

    // Amélioration IA du contenu si demandée
    if (enhanceWithAI) {
      content = await this.enhanceContentWithAI(content, type, template, model);
    }

    // Génération selon le format
    switch (type) {
      case 'pdf':
        return await this.generatePDF(content, template, title, author, coverImageUrl);
      case 'docx':
        return await this.generateDOCX(content, template, title, author, coverImageUrl);
      case 'pptx':
        return await this.generatePPTX(content, template);
      case 'markdown':
        return await this.generateMarkdown(content, template);
      case 'html':
        return await this.generateHTML(content, template);
      case 'xlsx':
        return await this.generateExcel(content);
      default:
        throw new Error(`Format non supporté: ${type}`);
    }
  }

  /**
   * Améliore le contenu avec IA via OpenRouter
   */
  private static async enhanceContentWithAI(content: string, type: string, template?: string, model?: string): Promise<string> {
    console.log('🤖 Amélioration IA du contenu avec', model);

    const prompt = this.createEnhancementPrompt(content, type, template);
    
    try {
      const result = await OpenRouterService.generateWithModel(
        [{ role: 'user', content: prompt }],
        model,
        { temperature: 0.3, max_tokens: 4000 }
      );

      return result.text;
    } catch (error) {
      console.warn('❌ Amélioration IA échouée, utilisation du contenu original:', error);
      return content;
    }
  }

  /**
   * Crée le prompt d'amélioration selon le type de document
   */
  private static createEnhancementPrompt(content: string, type: string, template?: string): string {
    const basePrompt = `Improve and structure the following content for a professional ${type.toUpperCase()} document`;
    
    const templateInstructions = {
      report: 'as a formal business report with executive summary, findings, and recommendations',
      presentation: 'as engaging presentation slides with clear headings and bullet points',
      letter: 'as a professional business letter with proper formatting',
      resume: 'as a professional resume with clear sections and achievements',
      contract: 'as a legal contract with proper clauses and terms'
    };

    const typeInstructions = {
      pdf: 'Optimize for PDF format with clear headings and structured paragraphs.',
      docx: 'Format for Word document with proper headings and formatting.',
      pptx: 'Structure as presentation slides with concise, impactful content.',
      markdown: 'Format using proper Markdown syntax with headers, lists, and emphasis.',
      html: 'Create semantic HTML with proper tags and structure.',
      xlsx: 'Structure as spreadsheet data with clear columns and rows.'
    };

    let enhancedPrompt = basePrompt;
    
    if (template && templateInstructions[template as keyof typeof templateInstructions]) {
      enhancedPrompt += ` ${templateInstructions[template as keyof typeof templateInstructions]}`;
    }
    
    enhancedPrompt += ` ${typeInstructions[type as keyof typeof typeInstructions]}`;
    enhancedPrompt += `\n\nOriginal content:\n${content}\n\nImproved version:`;

    return enhancedPrompt;
  }

  /**
   * Génère un PDF avec templates avancés
   */
  private static async generatePDF(content: string, template?: string, title?: string, author?: string, coverImageUrl?: string): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add cover page if cover image provided
    if (coverImageUrl && title) {
      await this.addCoverPage(pdfDoc, coverImageUrl, title, author, boldFont, font);
    }
    
    let currentPage = pdfDoc.addPage();
    const { width, height } = currentPage.getSize();
    const margin = 50;
    let y = height - margin;

    // En-tête selon le template
    if (template === 'report') {
      y = await this.addReportHeader(currentPage, boldFont, font, y, margin, width);
    } else if (template === 'letter') {
      y = await this.addLetterHeader(currentPage, boldFont, y, margin);
    }

    // Contenu principal
    const lines = this.wrapText(content, Math.floor((width - 2 * margin) / 6));
    
    for (const line of lines) {
      if (y < margin + 20) {
        currentPage = pdfDoc.addPage();
        y = height - margin;
      }
      
      const isHeading = line.match(/^#{1,3}\s/) || line.match(/^[A-Z][A-Z\s]+:$/);
      const fontSize = isHeading ? 14 : 12;
      const selectedFont = isHeading ? boldFont : font;
      
      currentPage.drawText(line || " ", { 
        x: margin, 
        y, 
        size: fontSize, 
        font: selectedFont,
        color: rgb(0, 0, 0)
      });
      
      y -= fontSize * 1.4;
    }

    return await pdfDoc.saveAsBase64({ dataUri: true });
  }

  /**
   * Génère un DOCX avec formatage avancé
   */
  private static async generateDOCX(content: string, template?: string, title?: string, author?: string, coverImageUrl?: string): Promise<string> {
    const paragraphs: any[] = [];

    // Add cover page if title provided
    if (title) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: 36 })],
          heading: HeadingLevel.TITLE,
          alignment: 'center'
        })
      );
      
      if (author) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `par ${author}`, size: 24 })],
            alignment: 'center'
          })
        );
      }
      
      paragraphs.push(new Paragraph({ text: "" })); // Page break
    }

    // En-tête selon le template
    if (template === 'resume') {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "CURRICULUM VITAE", bold: true, size: 32 })],
          heading: HeadingLevel.TITLE,
          alignment: 'center'
        })
      );
    }

    // Contenu structuré
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.trim() === '') {
        paragraphs.push(new Paragraph({ text: "" }));
        continue;
      }

      // Détection des titres
      if (line.match(/^#{1,3}\s/)) {
        const level = line.match(/^#{1,3}/)?.[0].length || 1;
        const text = line.replace(/^#{1,3}\s/, '');
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text, bold: true, size: 24 - (level * 2) })],
            heading: level === 1 ? HeadingLevel.HEADING_1 : 
                     level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3
          })
        );
      } else {
        paragraphs.push(new Paragraph({ text: line }));
      }
    }

    const doc = new DocxDocument({
      sections: [{ properties: {}, children: paragraphs }]
    });

    const base64 = await Packer.toBase64String(doc);
    return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
  }

  /**
   * Génère un PPTX avec templates de présentation
   */
  private static async generatePPTX(content: string, template?: string): Promise<string> {
    const pptx = new PptxGenJS();
    
    // Configuration du template
    if (template === 'presentation') {
      pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
    } else {
      pptx.defineLayout({ name: 'A4', width: 10, height: 7.5 });
    }

    // Diviser le contenu en slides
    const slides = this.contentToSlides(content);
    
    for (let i = 0; i < slides.length; i++) {
      const slide = pptx.addSlide();
      const slideContent = slides[i];
      
      // Titre de slide
      if (slideContent.title) {
        slide.addText(slideContent.title, {
          x: 0.5, y: 0.5, w: 9, h: 1,
          fontSize: 24, bold: true, color: '1f4788'
        });
      }
      
      // Contenu
      slide.addText(slideContent.content, {
        x: 0.5, y: slideContent.title ? 1.5 : 0.5,
        w: 9, h: slideContent.title ? 5 : 6,
        fontSize: 16, align: 'left', valign: 'top'
      });
      
      // Numéro de page
      slide.addText(`${i + 1} / ${slides.length}`, {
        x: 8.5, y: 6.5, w: 1, h: 0.5,
        fontSize: 12, color: '666666'
      });
    }

    const base64 = await pptx.write({ outputType: "base64" });
    return `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}`;
  }

  /**
   * Génère du Markdown structuré
   */
  private static async generateMarkdown(content: string, template?: string): Promise<string> {
    let markdown = content;
    
    // Amélioration du formatage Markdown
    if (template === 'report') {
      markdown = `# Rapport d'Analyse\n\n## Résumé Exécutif\n\n${content}\n\n---\n\n*Généré automatiquement par Chatelix*`;
    } else if (template === 'readme') {
      markdown = `# Projet\n\n## Description\n\n${content}\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\nÀ compléter\n`;
    }
    
    const base64 = btoa(unescape(encodeURIComponent(markdown)));
    return `data:text/markdown;base64,${base64}`;
  }

  /**
   * Génère du HTML sémantique
   */
  private static async generateHTML(content: string, template?: string): Promise<string> {
    const lines = content.split('\n');
    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document généré</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        h1, h2, h3 { color: #2563eb; }
        h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
        p { margin-bottom: 1rem; }
        .highlight { background-color: #fef3c7; padding: 0.25rem 0.5rem; border-radius: 0.25rem; }
    </style>
</head>
<body>`;

    for (const line of lines) {
      if (line.match(/^#{1,3}\s/)) {
        const level = line.match(/^#{1,3}/)?.[0].length || 1;
        const text = line.replace(/^#{1,3}\s/, '');
        html += `<h${level}>${text}</h${level}>\n`;
      } else if (line.trim()) {
        html += `<p>${line}</p>\n`;
      }
    }

    html += `
</body>
</html>`;

    const base64 = btoa(unescape(encodeURIComponent(html)));
    return `data:text/html;base64,${base64}`;
  }

  /**
   * Génère un Excel avec données structurées
   */
  private static async generateExcel(content: string): Promise<string> {
    // Pour l'instant, créer un CSV simple
    // Dans une vraie implémentation, utiliser une lib comme xlsx
    const lines = content.split('\n').filter(line => line.trim());
    const csv = lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n');
    
    const base64 = btoa(unescape(encodeURIComponent(csv)));
    return `data:application/vnd.ms-excel;base64,${base64}`;
  }

  // Méthodes utilitaires

  private static wrapText(text: string, maxWidth = 90): string[] {
    return text.split(/\r?\n/).flatMap((line) => {
      if (line.length <= maxWidth) return [line];
      
      const chunks: string[] = [];
      let current = line;
      while (current.length > maxWidth) {
        chunks.push(current.slice(0, maxWidth));
        current = current.slice(maxWidth);
      }
      chunks.push(current);
      return chunks;
    });
  }

  private static contentToSlides(content: string): Array<{ title?: string; content: string }> {
    const lines = content.split('\n');
    const slides: Array<{ title?: string; content: string }> = [];
    let currentSlide: { title?: string; content: string } = { content: '' };

    for (const line of lines) {
      if (line.match(/^#{1,2}\s/)) {
        // Nouveau slide avec titre
        if (currentSlide.content.trim()) {
          slides.push(currentSlide);
        }
        currentSlide = {
          title: line.replace(/^#{1,2}\s/, ''),
          content: ''
        };
      } else if (line.trim() === '---') {
        // Séparateur de slide
        if (currentSlide.content.trim() || currentSlide.title) {
          slides.push(currentSlide);
        }
        currentSlide = { content: '' };
      } else {
        currentSlide.content += line + '\n';
      }
    }

    if (currentSlide.content.trim() || currentSlide.title) {
      slides.push(currentSlide);
    }

    return slides.length > 0 ? slides : [{ content }];
  }

  private static async addReportHeader(page: any, boldFont: any, font: any, y: number, margin: number, width: number): Promise<number> {
    page.drawText('RAPPORT D\'ANALYSE', {
      x: margin, y, size: 18, font: boldFont, color: rgb(0, 0, 0)
    });
    y -= 30;
    
    page.drawText(`Date: ${new Date().toLocaleDateString('fr-FR')}`, {
      x: width - margin - 100, y: y + 20, size: 10, font: font, color: rgb(0.5, 0.5, 0.5)
    });
    
    return y - 20;
  }

  private static async addLetterHeader(page: any, boldFont: any, y: number, margin: number): Promise<number> {
    const date = new Date().toLocaleDateString('fr-FR', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    page.drawText(date, {
      x: margin, y, size: 12, font: boldFont, color: rgb(0, 0, 0)
    });
    
    return y - 40;
  }

  private static async addCoverPage(pdfDoc: any, coverImageUrl: string, title: string, author?: string, boldFont?: any, font?: any): Promise<void> {
    try {
      // Fetch and embed cover image
      const imageResponse = await fetch(coverImageUrl);
      const imageBytes = await imageResponse.arrayBuffer();
      const image = await pdfDoc.embedPng(imageBytes);
      
      const coverPage = pdfDoc.addPage();
      const { width, height } = coverPage.getSize();
      
      // Scale image to fit page while maintaining aspect ratio
      const imageAspectRatio = image.width / image.height;
      const pageAspectRatio = width / height;
      
      let imageWidth, imageHeight;
      if (imageAspectRatio > pageAspectRatio) {
        imageWidth = width;
        imageHeight = width / imageAspectRatio;
      } else {
        imageHeight = height;
        imageWidth = height * imageAspectRatio;
      }
      
      const x = (width - imageWidth) / 2;
      const y = (height - imageHeight) / 2;
      
      coverPage.drawImage(image, {
        x,
        y,
        width: imageWidth,
        height: imageHeight,
      });
      
      // Add title overlay if fonts available
      if (boldFont && title) {
        coverPage.drawText(title, {
          x: 50,
          y: 100,
          size: 32,
          font: boldFont,
          color: rgb(1, 1, 1) // White text
        });
        
        if (author && font) {
          coverPage.drawText(`par ${author}`, {
            x: 50,
            y: 60,
            size: 20,
            font: font,
            color: rgb(1, 1, 1)
          });
        }
      }
      
    } catch (error) {
      console.warn('Failed to add cover image:', error);
    }
  }
}