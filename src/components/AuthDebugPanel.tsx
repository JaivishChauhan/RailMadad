import React from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AuthDebugPanel: React.FC = () => {
  const { user, loading } = useAdminAuth();

  const handleForceStopLoading = () => {
    if ((window as any).debugAdminAuth) {
      (window as any).debugAdminAuth.forceStopLoading();
    }
  };

  const handleLogCurrentState = () => {
    console.log('🔍 Current Auth State:', {
      user,
      loading,
      timestamp: new Date().toISOString()
    });
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <Card className="fixed top-2.5 right-2.5 w-64 z-[9999] opacity-80 hover:opacity-100 transition-opacity shadow-lg bg-card/90 backdrop-blur">
      <CardContent className="p-3 text-xs font-mono space-y-2">
        <div className="font-bold border-b pb-1">Auth Debug Panel</div>
        <div className="flex justify-between"><span>Loading:</span> <span>{loading ? '✅ TRUE' : '❌ FALSE'}</span></div>
        <div className="flex justify-between"><span>User:</span> <span className="truncate max-w-[120px]" title={user?.email || ''}>{user ? `✅ ${user.email}` : '❌ NULL'}</span></div>
        <div className="flex justify-between"><span>Role:</span> <span>{user?.role || 'N/A'}</span></div>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={handleForceStopLoading}
          >
            Stop Loading
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={handleLogCurrentState}
          >
            Log State
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDebugPanel;
