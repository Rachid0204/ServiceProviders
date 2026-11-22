import React from 'react';
import { Outlet } from 'react-router-dom';

export const AdminLayout: React.FC = () => {
  return (
    <div
      data-layout="admin"
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-clip"
    >
      <Outlet />
    </div>
  );
};
