
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h4m-4 4h8m-8 4h8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">NewsCard Visualizer</h1>
        </div>
        <div className="hidden sm:block">
          <span className="text-sm text-gray-500 font-medium">AI-Powered Design Assistant</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
