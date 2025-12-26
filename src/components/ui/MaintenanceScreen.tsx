import React from 'react';
import { AlertTriangle, Hammer, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MaintenanceScreen = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-8 text-center border-t-4 border-amber-500">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Hammer className="w-10 h-10 text-amber-600 px-0.5" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">Under Maintenance</h1>
                <p className="text-slate-600 mb-8">
                    RailMadad is currently undergoing scheduled maintenance to improve our services.
                    We will be back shortly.
                </p>

                <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-500">
                        <span className="font-semibold block mb-1">Impact:</span>
                        Public portal is currently unavailable.
                        <br />
                        Railway Officials can login via the dedicated portal.
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="w-full"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" /> Check Status
                    </Button>
                </div>

                <div className="mt-8 pt-6 border-t">
                    <p className="text-xs text-slate-400">
                        RailMadad System • Indian Railways
                    </p>
                </div>
            </div>
        </div>
    );
};
