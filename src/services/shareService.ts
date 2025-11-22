import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const shareService = {
  // Get all shares for a board
  getShares: async (boardId: string) => {
    return axios.get(`${API_BASE}/boards/${boardId}/shares`);
  },

  // Share a board with an email
  shareBoard: async (boardId: string, email: string, permissionLevel: 'read' | 'edit', userId: string) => {
    return axios.post(`${API_BASE}/boards/${boardId}/share`, {
      email,
      permissionLevel,
      userId,
    });
  },

  // Update share permissions
  updateShare: async (boardId: string, shareId: string, permissionLevel: 'read' | 'edit') => {
    return axios.put(`${API_BASE}/boards/${boardId}/share/${shareId}`, {
      permissionLevel,
    });
  },

  // Revoke access
  revokeShare: async (boardId: string, shareId: string) => {
    return axios.delete(`${API_BASE}/boards/${boardId}/share/${shareId}`);
  },

  // Get board from share token
  getSharedBoard: async (shareToken: string) => {
    return axios.get(`${API_BASE}/boards/share/${shareToken}`);
  },
};
