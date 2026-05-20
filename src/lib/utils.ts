import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Categorias que NÃO devem ser validadas para reposição (itens duráveis)
export const CATEGORIAS_DURAVEIS = ['ferramentas', 'ferramenta', 'utensílios', 'eletrodomésticos', 'móveis', 'eletrônicos', 'construção'];

export const isConsumivel = (categoria?: string) => {
  if (!categoria) return true;
  return !CATEGORIAS_DURAVEIS.includes(categoria.toLowerCase().trim());
};

// Blindagem 1: Garante que o formatarTexto não quebre se receber números ou dados nulos
export const formatarTexto = (texto?: unknown) => {
  if (!texto || typeof texto !== 'string') return '';
  const limpo = texto.trim();
  if (limpo.length === 0) return '';
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
};

export const getErrorMessage = (error: unknown, fallback = 'Erro desconhecido') => {
  return error instanceof Error ? error.message : fallback;
};

// Blindagem de Datas: Valida rigorosamente no formato DD/MM/AAAA brasileiro
export const formatarData = (dataRaw?: string | null) => {
  if (!dataRaw || dataRaw.trim() === '-' || dataRaw.trim() === '') return '';
  
  const regex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
  const match = dataRaw.trim().match(regex);
  
  if (!match) return '';

  let dia = parseInt(match[1], 10);
  let mes = parseInt(match[2], 10);
  let ano = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

  if (ano < 100) ano += 2000;

  if (mes > 12 && dia <= 12) {
    [dia, mes] = [mes, dia];
  }

  if (mes < 1 || mes > 12) return '';

  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const diasPorMes = [0, 31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDia = diasPorMes[mes];

  if (dia < 1 || dia > maxDia) return '';
  if (ano < 2020 || ano > 2099) return '';

  const anoAtual = new Date().getFullYear();
  if (ano < anoAtual) {
    ano = anoAtual;
  }

  return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
};

export const compressImage = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((maxWidth * height) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP format, 0.8 quality
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
