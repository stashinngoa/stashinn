'use client';

export default function RoleSelect({ 
  userId, 
  initialRole 
}: { 
  userId: string, 
  initialRole: string 
}) {
  return (
    <>
      <input type="hidden" name="user_id" value={userId} />
      <select 
        name="admin_role" 
        defaultValue={initialRole}
        onChange={(e) => e.target.form?.requestSubmit()}
        className="bg-gray-950 border border-gray-700 rounded-md text-xs text-white px-2 py-1 focus:outline-none"
      >
        <option value="superadmin">Superadmin</option>
        <option value="finance">Finance</option>
        <option value="ops">Operations</option>
        <option value="support">Support</option>
      </select>
    </>
  );
}
