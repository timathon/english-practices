import React from 'react';
import { PlatformAdminPanel } from './PlatformAdminPanel';

export const AdminDashboard: React.FC<{ user: any }> = ({ user }) => {
  return <PlatformAdminPanel user={user} />;
};

export default AdminDashboard;
