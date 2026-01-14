import React, { useState } from 'react';
import { Search, Loader2, Info, Settings2 } from 'lucide-react';
import { SearchMode } from '../types';

interface SidePanelProps {
  onSearch: (term: string) => void;
  searchMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  explanation: string | null;
  isLoadingExplanation: boolean;
  isLoadingGraph: boolean;
}

const SidePanel: React.FC<SidePanelProps> = ({
  onSearch,
  searchMode,
  onModeChange,
  explanation,
  isLoadingExplanation,
  isLoadingGraph
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  return (
    <div className="absolute top-4 right-4 w-80 max-h-[90vh] flex flex-col gap-4 pointer-events-none">
      
      {/* Search Box Card */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-xl pointer-events-auto">
        <h2 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
          <Settings2 size={18} className="text-cyan-400" />
          Graph Controls
        </h2>
        
        <form onSubmit={handleSubmit} className="relative mb-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter starting term..."
            className="w-full bg-slate-800/80 border border-slate-600 text-white rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
          />
          <button 
            type="submit" 
            disabled={isLoadingGraph}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 disabled:opacity-50 transition-colors"
          >
            {isLoadingGraph ? <Loader2 size={16} className="animate-spin"/> : <Search size={16} />}
          </button>
        </form>

        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-1.5 border border-slate-700">
          <button
            onClick={() => onModeChange('default')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              searchMode === 'default' 
                ? 'bg-cyan-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Default
          </button>
          <button
            onClick={() => onModeChange('precise')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              searchMode === 'precise' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Precise
          </button>
        </div>
      </div>

      {/* Explanation Card */}
      <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-xl pointer-events-auto transition-all duration-300 ${explanation || isLoadingExplanation ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
        <h2 className="text-white text-lg font-bold mb-2 flex items-center gap-2">
          <Info size={18} className="text-purple-400" />
          Knowledge
        </h2>
        
        <div className="min-h-[100px] text-slate-300 text-sm leading-relaxed overflow-y-auto max-h-[40vh] pr-2">
          {isLoadingExplanation ? (
             <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
               <Loader2 size={24} className="animate-spin text-purple-500" />
               <span>Generating explanation...</span>
             </div>
          ) : (
            explanation || "Select a node to view details."
          )}
        </div>
      </div>
      
    </div>
  );
};

export default SidePanel;
