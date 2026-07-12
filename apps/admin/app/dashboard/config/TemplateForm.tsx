'use client';

import { useTransition, useState } from 'react';
import { updateEmailTemplate } from './actions';
import { renderPreview } from '@stashinn/lib/services/email';

export default function TemplateForm({ template }: { template: any }) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [currentHtml, setCurrentHtml] = useState(template.body_html);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('id', template.id);
    formData.set('is_active', formData.get('is_active') === 'on' ? 'true' : 'false');
    
    startTransition(() => {
      updateEmailTemplate(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-950 p-5 rounded-lg border border-gray-800 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <h3 className="text-sm font-bold text-gray-200">
          Template: <span className="text-red-400 font-mono">{template.slug}</span>
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-500">Active</span>
          <input 
            type="checkbox" 
            name="is_active" 
            defaultChecked={template.is_active}
            className="w-4 h-4 text-red-600 bg-gray-900 border-gray-700 rounded focus:ring-red-600 focus:ring-offset-gray-900"
          />
        </label>
      </div>

      <div className="flex gap-4 border-b border-gray-800 pb-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`text-xs font-bold px-2 py-1 ${activeTab === 'edit' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`text-xs font-bold px-2 py-1 ${activeTab === 'preview' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Preview
        </button>
      </div>

      {activeTab === 'edit' ? (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <input
              type="text"
              name="subject"
              defaultValue={template.subject}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">HTML Body</label>
            <textarea
              name="body_html"
              value={currentHtml}
              onChange={(e) => setCurrentHtml(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
        </>
      ) : (
        <div className="bg-white rounded p-4 h-[200px] overflow-y-auto">
          {/* Injecting raw HTML safely in an admin-only context for preview */}
          <div 
            className="text-black"
            dangerouslySetInnerHTML={{ __html: renderPreview(currentHtml, template.variables || []) }} 
          />
        </div>
      )}

      {template.variables && template.variables.length > 0 && (
        <div className="bg-gray-900 p-2 rounded border border-gray-800">
          <span className="text-xs text-gray-500 block mb-1">Available Variables:</span>
          <div className="flex flex-wrap gap-1">
            {template.variables.map((v: string) => (
              <span key={v} className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-[10px] font-mono rounded">
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 text-xs font-bold rounded text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save Template'}
      </button>
    </form>
  );
}
