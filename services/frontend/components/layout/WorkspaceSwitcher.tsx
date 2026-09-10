'use client';

import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

// Ported from old app/components/layout/WorkspaceSwitcher.tsx.
// The old version used styled-components; here the exact same visual styles
// are reproduced with inline styles + Tailwind so no new dependency is added
// and the rendered UI stays identical.

interface WorkspaceSwitcherProps {
  workspaces: any[];
  currentWorkspace: any;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
}

const Icon = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      width: '35px',
      height: '35px',
      borderRadius: '20px',
      background: 'linear-gradient(to bottom, #344bfd, #4a8cd7)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

const Name = ({ title }: { title: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
    <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#1d2939', fontWeight: 500 }}>
      {title}
    </p>
    <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#717182' }}>
      Department
    </p>
  </div>
);

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  workspaces,
  currentWorkspace,
  onSwitchWorkspace,
  onCreateWorkspace,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitchWorkspace = (workspaceId: string) => {
    onSwitchWorkspace(workspaceId);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '250px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '5px 10px',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          backgroundColor: 'white',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon>{currentWorkspace?.name.charAt(0).toUpperCase()}</Icon>
          <Name title={currentWorkspace?.name} />
        </div>
        <ChevronDown size={24} color="#717182" />
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            marginTop: '5px',
            zIndex: 10,
          }}
        >
          {workspaces.map((ws) => (
            <div
              key={ws.workspaceId._id}
              onClick={() => handleSwitchWorkspace(ws.workspaceId._id)}
              className="hover:bg-[#F3F4F6]"
              style={{
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Icon>{ws.workspaceId.name.charAt(0).toUpperCase()}</Icon>
              <Name title={ws.workspaceId.name} />
            </div>
          ))}
          <div
            onClick={onCreateWorkspace}
            className="hover:bg-[#F3F4F6]"
            style={{
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderTop: '1px solid #E5E7EB',
              color: '#344bfd',
            }}
          >
            <Plus size={20} />
            <span>Create New Workspace</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
