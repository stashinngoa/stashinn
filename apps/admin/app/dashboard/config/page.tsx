import { createClient } from '@stashinn/lib/supabase/server';
import ConfigForm from './ConfigForm';
import TemplateForm from './TemplateForm';
import CreateTemplateForm from './CreateTemplateForm';

export default async function ConfigPage() {
  const supabase = await createClient();

  // Fetch System Config
  const { data: configRows } = await supabase
    .from('system_config')
    .select('*')
    .order('key');

  // Fetch Email Templates
  const { data: emailTemplates } = await supabase
    .from('email_templates')
    .select('*')
    .order('slug');

  const configMap = (configRows || []).reduce((acc: any, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Platform Configuration</h1>
        <p className="text-gray-500 mt-1">Manage global system variables and email templates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* System Config */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">System Variables</h2>
            <p className="text-sm text-gray-500">Core parameters that drive platform logic.</p>
          </div>
          <div className="p-6">
            <ConfigForm initialConfig={configMap} />
          </div>
        </div>

        {/* Email Templates */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">Email Templates</h2>
            <p className="text-sm text-gray-500">Manage transactional email content.</p>
          </div>
          <div className="p-6 flex-1 overflow-y-auto max-h-[800px]">
            <CreateTemplateForm />
            
            <div className="space-y-6">
            {!emailTemplates || emailTemplates.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No email templates found in database.</p>
            ) : (
              emailTemplates.map((template) => (
                <TemplateForm key={template.id} template={template} />
              ))
            )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
