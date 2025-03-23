// src/frontend/components/help/HelpDocumentation.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

// Types
export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: Date;
  relatedArticles?: string[];
}

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

// Help Search Component
interface HelpSearchProps {
  onSearch: (query: string) => void;
  recentSearches?: string[];
  popularArticles?: HelpArticle[];
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
  onSearch,
  recentSearches = [],
  popularArticles = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="help-search">
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ml-3">
            <Button
              type="submit"
              variant="primary"
            >
              Search
            </Button>
          </div>
        </div>
      </form>

      {recentSearches.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <Button
                key={index}
                variant="outline"
                size="small"
                onClick={() => {
                  setSearchQuery(search);
                  onSearch(search);
                }}
              >
                {search}
              </Button>
            ))}
          </div>
        </div>
      )}

      {popularArticles.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Popular Articles</h3>
          <ul className="space-y-2">
            {popularArticles.map(article => (
              <li key={article.id}>
                <Link
                  to={`/help/article/${article.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Help Category Card Component
interface HelpCategoryCardProps {
  category: HelpCategory;
  articleCount: number;
  onClick: () => void;
}

export const HelpCategoryCard: React.FC<HelpCategoryCardProps> = ({
  category,
  articleCount,
  onClick
}) => {
  return (
    <div 
      className="bg-white overflow-hidden shadow rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 rounded-md bg-blue-100 text-blue-600">
            {category.icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-lg font-medium text-gray-900 truncate">
                {category.name}
              </dt>
              <dd>
                <div className="text-sm text-gray-500">
                  {category.description}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {articleCount} article{articleCount !== 1 ? 's' : ''}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

// Help Article List Component
interface HelpArticleListProps {
  articles: HelpArticle[];
  title: string;
  onArticleClick: (articleId: string) => void;
  emptyMessage?: string;
}

export const HelpArticleList: React.FC<HelpArticleListProps> = ({
  articles,
  title,
  onArticleClick,
  emptyMessage = "No articles found."
}) => {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
      </div>
      {articles.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {articles.map(article => (
            <li key={article.id}>
              <div 
                className="block hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onArticleClick(article.id)}
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {article.title}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {article.category}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <div className="flex">
                      {article.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="mr-2 text-xs inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-gray-500">
                      Updated {new Date(article.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-5 text-center text-gray-500 sm:px-6">
          {emptyMessage}
        </div>
      )}
    </div>
  );
};

// Help Article Component
interface HelpArticleProps {
  article: HelpArticle;
  relatedArticles?: HelpArticle[];
  onRelatedArticleClick: (articleId: string) => void;
  onBack: () => void;
}

export const HelpArticle: React.FC<HelpArticleProps> = ({
  article,
  relatedArticles = [],
  onRelatedArticleClick,
  onBack
}) => {
  return (
    <div className="help-article">
      <div className="mb-4">
        <Button
          variant="outline"
          size="small"
          onClick={onBack}
        >
          ← Back to articles
        </Button>
      </div>

      <Card>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {article.category}
              </span>
              {article.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date(article.lastUpdated).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {relatedArticles.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Related Articles</h2>
            <ul className="mt-4 space-y-2">
              {relatedArticles.map(relatedArticle => (
                <li 
                  key={relatedArticle.id}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                  onClick={() => onRelatedArticleClick(relatedArticle.id)}
                >
                  {relatedArticle.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
};

// Interactive Guided Tour Component
interface TourStep {
  id: string;
  title: string;
  description: string;
  element: string; // CSS selector for the target element
  position: 'top' | 'right' | 'bottom' | 'left';
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onComplete: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  steps,
  isActive,
  currentStep,
  onNext,
  onPrev,
  onClose,
  onComplete
}) => {
  const [tooltipStyle, setTooltipStyle] = useState({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (isActive && steps[currentStep]) {
      const targetElement = document.querySelector(steps[currentStep].element);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const tooltipWidth = 300; // Approximate width of tooltip
        const tooltipHeight = 150; // Approximate height of tooltip
        
        // Calculate position based on specified position
        let top = 0;
        let left = 0;
        
        switch (steps[currentStep].position) {
          case 'top':
            top = rect.top - tooltipHeight - 10;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
          case 'right':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.right + 10;
            break;
          case 'bottom':
            top = rect.bottom + 10;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
          case 'left':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.left - tooltipWidth - 10;
            break;
        }
        
        // Ensure the tooltip stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (left < 10) left = 10;
        if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
        if (top < 10) top = 10;
        if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10;
        
        setTooltipStyle({
          top,
          left,
        });
        
        // Highlight the target element
        targetElement.classList.add('tour-highlight');
        
        return () => {
          targetElement.classList.remove('tour-highlight');
        };
      }
    }
  }, [isActive, currentStep, steps]);

  if (!isActive || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50"></div>
      
      {/* Tooltip */}
      <div
        className="fixed bg-white rounded-lg shadow-lg p-4 w-80 z-50"
        style={{
          top: `${tooltipStyle.top}px`,
          left: `${tooltipStyle.left}px`,
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900">{step.title}</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">{step.description}</p>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="small"
                onClick={onPrev}
              >
                Previous
              </Button>
            )}
            {isLastStep ? (
              <Button
                variant="primary"
                size="small"
                onClick={onComplete}
              >
                Finish
              </Button>
            ) : (
              <Button
                variant="primary"
                size="small"
                onClick={onNext}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick Help Widget Component
interface QuickHelpWidgetProps {
  categories: HelpCategory[];
  popularArticles: HelpArticle[];
  onCategoryClick: (categoryId: string) => void;
  onArticleClick: (articleId: string) => void;
  onStartTour: () => void;
  onContactSupport: () => void;
}

export const QuickHelpWidget: React.FC<QuickHelpWidgetProps> = ({
  categories,
  popularArticles,
  onCategoryClick,
  onArticleClick,
  onStartTour,
  onContactSupport
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-lg p-4 w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Quick Help</h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={() => setIsOpen(false)}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Help Categories</h4>
              <div className="space-y-2">
                {categories.slice(0, 3).map(category => (
                  <div
                    key={category.id}
                    className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      onCategoryClick(category.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex-shrink-0 p-1 rounded-md bg-blue-100 text-blue-600">
                      {category.icon}
                    </div>
                    <div className="ml-3 text-sm font-medium text-gray-700">
                      {category.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Popular Articles</h4>
              <ul className="space-y-1">
                {popularArticles.slice(0, 3).map(article => (
                  <li 
                    key={article.id}
                    className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                    onClick={() => {
                      onArticleClick(article.id);
                      setIsOpen(false);
                    }}
                  >
                    {article.title}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  onStartTour();
                  setIsOpen(false);
                }}
              >
                Start Guided Tour
              </Button>
              
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  onContactSupport();
                  setIsOpen(false);
                }}
              >
                Contact Support
              </Button>
              
              <Link
                to="/help"
                className="text-sm text-center text-blue-600 hover:text-blue-800"
                onClick={() => setIsOpen(false)}
              >
                Visit Help Center
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="bg-blue-600 p-3 rounded-full text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => setIsOpen(true)}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

// Main Help Center Component
interface HelpCenterProps {
  categories: HelpCategory[];
  articles: HelpArticle[];
  popularArticles: HelpArticle[];
  recentSearches?: string[];
  onSearch: (query: string) => void;
  onStartTour: () => void;
  onContactSupport: () => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({
  categories,
  articles,
  popularArticles,
  recentSearches = [],
  onSearch,
  onStartTour,
  onContactSupport
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [searchResults, setSearchResults] = useState<HelpArticle[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle search submission
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
    
    // In a real app, this would call an API and update searchResults
    // For now, we'll simulate a search
    const filtered = articles.filter(
      article => 
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.content.toLowerCase().includes(query.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    
    setSearchResults(filtered);
    setSelectedCategory(null);
    setSelectedArticle(null);
  };

  // Handle category selection
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedArticle(null);
    setSearchResults(null);
    setSearchQuery('');
  };

  // Handle article selection
  const handleArticleClick = (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (article) {
      setSelectedArticle(article);
    }
  };

  // Get related articles
  const getRelatedArticles = (article: HelpArticle) => {
    if (!article.relatedArticles) return [];
    return article.relatedArticles
      .map(id => articles.find(a => a.id === id))
      .filter(a => a) as HelpArticle[];
  };

  // Get filtered articles by category
  const getArticlesByCategory = (categoryId: string) => {
    return articles.filter(article => article.category === categoryId);
  };

  // Calculate article count by category
  const getArticleCountByCategory = (categoryId: string) => {
    return articles.filter(article => article.category === categoryId).length;
  };

  // Render content based on selected state
  const renderContent = () => {
    if (selectedArticle) {
      return (
        <HelpArticle
          article={selectedArticle}
          relatedArticles={getRelatedArticles(selectedArticle)}
          onRelatedArticleClick={handleArticleClick}
          onBack={() => setSelectedArticle(null)}
        />
      );
    }

    if (selectedCategory) {
      const categoryName = categories.find(c => c.id === selectedCategory)?.name || 'Category';
      return (
        <div>
          <div className="mb-4">
            <Button
              variant="outline"
              size="small"
              onClick={() => setSelectedCategory(null)}
            >
              ← Back to categories
            </Button>
          </div>
          
          <HelpArticleList
            articles={getArticlesByCategory(selectedCategory)}
            title={`${categoryName} Articles`}
            onArticleClick={handleArticleClick}
            emptyMessage={`No articles found in ${categoryName}.`}
          />
        </div>
      );
    }

    if (searchResults) {
      return (
        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              {searchResults.length} results for "{searchQuery}"
            </p>
          </div>
          
          <HelpArticleList
            articles={searchResults}
            title="Search Results"
            onArticleClick={handleArticleClick}
            emptyMessage={`No articles found for "${searchQuery}".`}
          />
        </div>
      );
    }

    return (
      <div>
        <Card className="mb-8">
          <HelpSearch
            onSearch={handleSearch}
            recentSearches={recentSearches}
            popularArticles={popularArticles}
          />
        </Card>
        
        <h2 className="text-xl font-bold text-gray-900 mb-4">Browse by Category</h2>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(category => (
            <HelpCategoryCard
              key={category.id}
              category={category}
              articleCount={getArticleCountByCategory(category.id)}
              onClick={() => handleCategoryClick(category.id)}
            />
          ))}
        </div>
        
        {popularArticles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Articles</h2>
            <HelpArticleList
              articles={popularArticles}
              title="Popular Articles"
              onArticleClick={handleArticleClick}
            />
          </div>
        )}
        
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Need more help?</h2>
          <p className="text-gray-600 mb-4">
            Can't find what you're looking for? We're here to help you get the most out of our platform.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={onStartTour}
            >
              Take a Guided Tour
            </Button>
            
            <Button
              variant="outline"
              onClick={onContactSupport}
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="help-center">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
        <p className="text-gray-500">
          Get help with using the Advanced Pilot Training Platform
        </p>
      </div>
      
      {renderContent()}
    </div>
  );
};

// CSS for Tour Highlight (Add to your global CSS)
/*
.tour-highlight {
  position: relative;
  z-index: 51;
  box-shadow: 0 0 0 4px rgba(66, 153, 225, 0.5);
  border-radius: 4px;
}
*/