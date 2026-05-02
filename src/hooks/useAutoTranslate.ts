import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

// Simple in-memory cache for translations
const translationCache: Record<string, Record<string, string>> = {};

export function useAutoTranslate() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const translateText = useCallback(async (text: string): Promise<string> => {
    if (!text || currentLanguage === 'pl') {
      return text;
    }

    // Check cache first
    const cacheKey = `${currentLanguage}:${text}`;
    if (translationCache[currentLanguage]?.[text]) {
      return translationCache[currentLanguage][text];
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { texts: [text], targetLanguage: currentLanguage }
      });

      if (error) throw error;

      const translation = data.translations[0] || text;
      
      // Cache the result
      if (!translationCache[currentLanguage]) {
        translationCache[currentLanguage] = {};
      }
      translationCache[currentLanguage][text] = translation;

      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [currentLanguage]);

  const translateTexts = useCallback(async (texts: string[]): Promise<string[]> => {
    if (!texts.length || currentLanguage === 'pl') {
      return texts;
    }

    // Check which texts need translation
    const textsToTranslate: string[] = [];
    const cachedResults: Record<number, string> = {};

    texts.forEach((text, index) => {
      if (translationCache[currentLanguage]?.[text]) {
        cachedResults[index] = translationCache[currentLanguage][text];
      } else if (text) {
        textsToTranslate.push(text);
      }
    });

    // If all cached, return immediately
    if (textsToTranslate.length === 0) {
      return texts.map((text, index) => cachedResults[index] || text);
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { texts: textsToTranslate, targetLanguage: currentLanguage }
      });

      if (error) throw error;

      // Cache new translations
      if (!translationCache[currentLanguage]) {
        translationCache[currentLanguage] = {};
      }

      textsToTranslate.forEach((text, i) => {
        if (data.translations[i]) {
          translationCache[currentLanguage][text] = data.translations[i];
        }
      });

      // Merge cached and new translations
      let translateIndex = 0;
      return texts.map((text, index) => {
        if (cachedResults[index] !== undefined) {
          return cachedResults[index];
        }
        const translation = data.translations[translateIndex] || text;
        translateIndex++;
        return translation;
      });

    } catch (error) {
      console.error('Translation error:', error);
      return texts;
    }
  }, [currentLanguage]);

  return {
    translateText,
    translateTexts,
    currentLanguage,
    needsTranslation: currentLanguage !== 'pl'
  };
}

// Hook for translating a single value with state management
export function useTranslatedText(originalText: string) {
  const [translatedText, setTranslatedText] = useState(originalText);
  const [isLoading, setIsLoading] = useState(false);
  const { translateText, needsTranslation } = useAutoTranslate();

  useEffect(() => {
    if (!needsTranslation || !originalText) {
      setTranslatedText(originalText);
      return;
    }

    setIsLoading(true);
    translateText(originalText)
      .then(setTranslatedText)
      .finally(() => setIsLoading(false));
  }, [originalText, translateText, needsTranslation]);

  return { text: translatedText, isLoading };
}

// Hook for translating an array of values
export function useTranslatedTexts(originalTexts: string[]) {
  const [translatedTexts, setTranslatedTexts] = useState(originalTexts);
  const [isLoading, setIsLoading] = useState(false);
  const { translateTexts, needsTranslation } = useAutoTranslate();

  useEffect(() => {
    if (!needsTranslation || !originalTexts.length) {
      setTranslatedTexts(originalTexts);
      return;
    }

    setIsLoading(true);
    translateTexts(originalTexts)
      .then(setTranslatedTexts)
      .finally(() => setIsLoading(false));
  }, [originalTexts.join('|'), translateTexts, needsTranslation]);

  return { texts: translatedTexts, isLoading };
}
