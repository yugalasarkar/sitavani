import React, { useEffect, useState } from 'react';
import type { Article, DisplayLanguage, NewsCategory } from '../types';
import { ArticleModal } from './ArticleModal';
import { DispatchWire } from './DispatchWire';

interface DispatchWireIslandProps {
  articles: Article[];
  language: DisplayLanguage;
  selectedCategory: NewsCategory | 'ALL';
  searchQuery: string;
  excludedArticleIds: string[];
}

export const DispatchWireIsland: React.FC<DispatchWireIslandProps> = ({
  articles,
  language,
  selectedCategory: initialCategory,
  searchQuery: initialSearch,
  excludedArticleIds
}) => {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'ALL'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [visibleArticles, setVisibleArticles] = useState(articles);
  const [feedError, setFeedError] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      try {
        const response = await fetch(`/api/feed?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not refresh the published feed.');
        const excluded = new Set(excludedArticleIds);
        setVisibleArticles(Array.isArray(data.articles) ? data.articles.filter((article: Article) => !excluded.has(article.id)) : []);
        setFeedError('');
      } catch (error) {
        if (!controller.signal.aborted) setFeedError(error instanceof Error ? error.message : 'Could not refresh the published feed.');
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedCategory, searchQuery, excludedArticleIds]);

  const updateUrl = (category: NewsCategory | 'ALL', search: string) => {
    const params = new URLSearchParams(window.location.search);
    if (category === 'ALL') params.delete('category');
    else params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    else params.delete('search');
    const query = params.toString();
    window.history.replaceState({}, '', query ? `/?${query}` : '/');
  };

  const handleCategoryChange = (category: NewsCategory | 'ALL') => {
    setSelectedCategory(category);
    updateUrl(category, searchQuery);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    updateUrl(selectedCategory, query);
  };

  return (
    <>
      <DispatchWire
        articles={visibleArticles}
        language={language}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSelect={setSelectedArticle}
      />
      {feedError && <p role="status" className="-mt-10 mb-10 text-xs text-amber-300">{feedError}</p>}
      <ArticleModal article={selectedArticle} language={language} onClose={() => setSelectedArticle(null)} />
    </>
  );
};
