import React from 'react';
import { Home, FileText, FolderOpen, Archive } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import useProjectStore from '../store/useProjectStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const currentProject = useProjectStore((state) =>
    state.projects.find((p) => p.id === state.currentProjectId)
  );

  const navItems = [
    { path: '/', label: '项目首页', icon: Home },
    { path: '/volumes', label: '组卷清单', icon: FolderOpen },
    { path: '/contents', label: '卷内目录', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Archive className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">竣工资料组卷系统</h1>
                {currentProject && (
                  <p className="text-xs text-gray-500">
                    {currentProject.projectName} - {currentProject.section}
                  </p>
                )}
              </div>
            </div>
            {currentProject && (
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                  {currentProject.projectType}工程
                </span>
                <span className="text-gray-400">|</span>
                <span>{currentProject.unitProject}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
