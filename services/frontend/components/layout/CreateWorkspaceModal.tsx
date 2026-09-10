'use client';

import React, { useState } from 'react';
import { postData } from '@/lib/fetch-util';
import { toast } from 'sonner';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onWorkspaceCreated: () => void;
}

export function CreateWorkspaceModal({ open, onClose, onWorkspaceCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await postData('/workspace', {
        // ✅ Singular
        name,
        description,
      });
      toast.success('Workspace created successfully!');
      onWorkspaceCreated();
      onClose();
      // Reset form
      setName('');
      setDescription('');
    } catch (error) {
      toast.error('Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full sm:max-w-[500px] mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-[20px] font-bold font-['Inter'] leading-none tracking-tight">
            Create New Workspace
          </h2>
          <p className="font-['Inter'] text-sm text-gray-500">
            Create a new workspace to organize your projects and team collaboration.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-[15px] mt-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium leading-none">
              Workspace Name *
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="font-['Inter'] flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium leading-none">
              Workspace Description
            </label>
            <textarea
              id="description"
              placeholder="Enter workspace description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="font-['Inter'] resize-none flex w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="font-['Inter'] inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#F2761B] hover:bg-[#F2761B]/90 font-['Inter'] inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 text-white disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
