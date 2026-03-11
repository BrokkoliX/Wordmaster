/**
 * LanguageConfigContext
 *
 * Provides the admin-controlled language & feature config to the entire
 * app tree. Fetch is triggered once on mount (and can be manually
 * refreshed via the `refresh` function exposed by the context).
 *
 * Usage:
 *   const { config, loading } = useLanguageConfig();
 *   const features = getPairFeatures(config, 'en', 'fr');
 *   if (!features.fill_in_blank) { ... hide or disable the mode ... }
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchLanguageConfig } from '../services/languageConfigService';

const LanguageConfigContext = createContext(null);

export function LanguageConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchLanguageConfig();
      setConfig(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <LanguageConfigContext.Provider value={{ config, loading, refresh: load }}>
      {children}
    </LanguageConfigContext.Provider>
  );
}

export function useLanguageConfig() {
  const ctx = useContext(LanguageConfigContext);
  if (!ctx) {
    throw new Error('useLanguageConfig must be used inside LanguageConfigProvider');
  }
  return ctx;
}
