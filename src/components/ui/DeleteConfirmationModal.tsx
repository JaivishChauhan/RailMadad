import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  complaintId: string;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  complaintId,
  isLoading = false
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleFinalConfirm = () => {
    if (confirmText.toLowerCase() === 'delete') {
      onConfirm();
    }
  };

  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step === 2 && confirmText.toLowerCase() === 'delete') {
      handleFinalConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-red-600">
            {step === 1 ? 'Delete Complaint?' : 'Final Confirmation'}
          </CardTitle>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Complaint ID: {complaintId}</p>
                <p className="text-sm text-gray-600 truncate">Title: {title}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">
                  ⚠️ This action cannot be undone. The complaint and all associated data will be permanently removed.
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this complaint?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleFirstConfirm} disabled={isLoading}>
                  Yes, Delete
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-100 border border-red-300 rounded-md p-4">
                <p className="text-sm text-red-900 font-medium mb-2">
                  🛑 FINAL WARNING
                </p>
                <p className="text-sm text-red-800">
                  You are about to permanently delete complaint <strong>{complaintId}</strong>.
                  This action is irreversible.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Type "DELETE" to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Type DELETE here"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleFinalConfirm} 
                  disabled={confirmText.toLowerCase() !== 'delete' || isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Permanently Delete'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
