'use client';

import { useTransition, useState } from 'react';
import { createEmailTemplate } from './actions';

export default function CreateTemplateForm() {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await createEmailTemplate(formData);
        setIsOpen(false);
      } catch (err: any) {
        setError(err.message || 'Failed to create template');
      }
    });
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
        Create New Template
      </button>
    );
  }

  return (
    <div className="mb-6 bg-gray-900 border border-blue-900/50 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
        <h3 className="font-bold text-white">Create New Template</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Slug (Unique ID)</label>
            <input
              type="text"
              name="slug"
              required
              placeholder="e.g. kyc_approved"
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Variables (comma-separated)</label>
            <input
              type="text"
              name="variables"
              placeholder="e.g. partner_name, login_url"
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
          <input
            type="text"
            name="subject"
            required
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">HTML Body</label>
          <textarea
            name="body_html"
            required
            rows={5}
            placeholder="<p>Hello {{partner_name}},</p>"
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
}
