/**
 * OrganizationManager - Manage organization and invite team members
 */

import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../../api/auth';

interface OrganizationManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  acceptedAt: string | null;
}

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  joinedAt: string;
}

interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

interface Owner {
  email: string;
  firstName: string;
  lastName: string;
}

export const OrganizationManager: React.FC<OrganizationManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'invite'>('members');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // Fetch organization data
  useEffect(() => {
    if (isOpen) {
      fetchOrganizationData();
    }
  }, [isOpen]);

  const fetchOrganizationData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/organization`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organization data');
      }

      const data = await response.json();
      setOrganization(data.organization);
      setOwner(data.owner);
      setMembers(data.members || []);
      setInvitations([]); // TODO: fetch invitations when endpoint ready
    } catch (err: any) {
      setError(err.message);
      // Fallback to placeholder if API fails
      setOrganization({ id: '1', name: 'My Organization', createdAt: '2026-04-15' });
      setOwner({ email: 'owner@example.com', firstName: 'Owner', lastName: 'User' });
      setMembers([
        { id: '1', email: 'owner@example.com', firstName: 'Owner', lastName: 'User', role: 'owner', joinedAt: '2026-04-15' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setError(null);
    setInviteSuccess(false);
    setInviteUrl(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteSuccess(true);
      setInviteUrl(data.inviteUrl || null);
      setInvitations([...invitations, {
        id: data.invitation?.id || Date.now().toString(),
        email: inviteEmail,
        role: inviteRole,
        invitedAt: new Date().toISOString(),
        acceptedAt: null,
      }]);
      setInviteEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-screen md:min-h-0 md:flex md:items-center md:justify-center md:p-4">
        <div className="relative bg-white md:rounded-2xl shadow-2xl w-full md:max-w-2xl md:mx-auto overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Organization</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members' 
                  ? 'border-rose-500 text-rose-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Team Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('invite')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invite' 
                  ? 'border-rose-500 text-rose-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Invite Members
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'members' ? (
              <div className="space-y-4">
                {/* Organization Owner Info */}
                {owner && (
                  <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                    <h3 className="text-sm font-medium text-rose-900 mb-2">Organization Owner</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{owner.firstName} {owner.lastName}</p>
                        <p className="text-sm text-gray-600">{owner.email}</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-rose-200 text-rose-800 rounded">Owner</span>
                    </div>
                  </div>
                )}

                <h3 className="text-sm font-medium text-gray-700">Current Members</h3>
                {members.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No members yet</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-rose-100 text-rose-700 rounded">
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {invitations.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mt-6">Pending Invitations</h3>
                    <div className="space-y-2 mt-2">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{inv.email}</p>
                            <p className="text-sm text-gray-500">Invited as {inv.role}</p>
                          </div>
                          <span className="text-xs text-amber-600">Pending</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="inviteEmail"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                    placeholder="colleague@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="inviteRole" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="inviteRole"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  >
                    <option value="staff">Staff - Can view and edit inventory</option>
                    <option value="manager">Manager - Can manage locations and products</option>
                    <option value="admin">Admin - Full access except billing</option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                {inviteSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    Invitation sent successfully!
                  </div>
                )}

                {inviteUrl && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Invite Link:</p>
                    <p className="text-xs text-blue-600 break-all">{inviteUrl}</p>
                    <p className="text-xs text-blue-500 mt-1">Share this link with {inviteEmail}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
                >
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
