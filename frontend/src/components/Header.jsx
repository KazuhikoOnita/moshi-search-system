import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 cursor-pointer hover:text-primary-600 transition-colors">
            📚 社内模試検索システム
          </h1>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {user.picture && (
                <img 
                  src={user.picture} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}