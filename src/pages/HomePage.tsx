import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  FolderOpen, 
  Building2, 
  Calendar, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  Download,
  Upload,
  HardDrive,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../store/useProjectStore';
import type { ProjectType, ProjectBackup } from '../types';
import { templates } from '../data/templates';

const projectTypeOptions: { value: ProjectType; label: string; description: string }[] = [
  { value: '房建', label: '房屋建筑工程', description: '住宅、商业、公共建筑等' },
  { value: '市政', label: '市政基础设施工程', description: '道路、桥梁、管线等' },
  { value: '装修', label: '装饰装修工程', description: '新建、改建、扩建装修工程' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    projects, 
    createProject, 
    deleteProject, 
    setCurrentProject, 
    generateVolumeStructure, 
    getProjectStats,
    exportProjectBackup,
    importProjectBackup,
  } = useProjectStore();
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    section: '',
    unitProject: '',
    subDivision: '',
    projectType: '房建' as ProjectType,
  });
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectType>('房建');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newProject = createProject({
      ...formData,
    });
    
    generateVolumeStructure(newProject.id, formData.projectType);
    setCurrentProject(newProject.id);
    setShowForm(false);
    setFormData({
      projectName: '',
      section: '',
      unitProject: '',
      subDivision: '',
      projectType: '房建',
    });
    
    navigate('/volumes');
  };

  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId);
    navigate('/volumes');
  };

  const handleExportProject = (projectId: string, projectName: string) => {
    try {
      const backup = exportProjectBackup(projectId);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `竣工资料备份_${projectName}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    }
  };

  const handleImportClick = () => {
    setImportError('');
    setImportSuccess('');
    importFileRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const backup = JSON.parse(content) as ProjectBackup;

        if (!backup.version || !backup.project || !backup.volumes) {
          throw new Error('文件格式不正确，缺少必要信息');
        }

        importProjectBackup(backup);
        setImportSuccess(`成功导入项目：${backup.project.projectName}`);
        setImportError('');
        
        setTimeout(() => {
          setImportSuccess('');
        }, 3000);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : '导入失败，文件格式错误');
        setImportSuccess('');
      }
    };
    reader.onerror = () => {
      setImportError('文件读取失败');
    };
    reader.readAsText(file);

    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCompletionColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600';
    if (percent >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">项目管理</h2>
          <p className="text-sm text-gray-500 mt-1">创建和管理工程项目的竣工资料组卷</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            onClick={handleImportClick}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>导入项目</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>新建项目</span>
          </button>
        </div>
      </div>

      {importError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{importError}</p>
          </div>
          <button
            onClick={() => setImportError('')}
            className="p-1 text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {importSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{importSuccess}</p>
          </div>
          <button
            onClick={() => setImportSuccess('')}
            className="p-1 text-green-400 hover:text-green-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">新建工程项目</h3>
              <p className="text-sm text-gray-500 mt-1">录入工程基本信息，选择组卷模板</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">工程信息</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      工程名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="请输入工程名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      标段 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="如：一标段"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      单位工程 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.unitProject}
                      onChange={(e) => setFormData({ ...formData, unitProject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="如：1#楼"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      分部分项
                    </label>
                    <input
                      type="text"
                      value={formData.subDivision}
                      onChange={(e) => setFormData({ ...formData, subDivision: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="如：主体结构分部"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">选择组卷模板</h4>
                <p className="text-sm text-gray-500">选择适合的工程类型，系统将自动生成案卷框架</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {projectTypeOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => {
                        setFormData({ ...formData, projectType: option.value });
                        setSelectedTemplate(option.value);
                      }}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedTemplate === option.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          selectedTemplate === option.value ? 'bg-primary-100' : 'bg-gray-100'
                        }`}>
                          <Building2 className={`w-5 h-5 ${
                            selectedTemplate === option.value ? 'text-primary-600' : 'text-gray-500'
                          }`} />
                        </div>
                        <div>
                          <h5 className={`font-medium ${
                            selectedTemplate === option.value ? 'text-primary-900' : 'text-gray-900'
                          }`}>{option.label}</h5>
                          <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 text-sm">
                    {templates[selectedTemplate].name}
                  </h5>
                  <p className="text-xs text-blue-700 mt-1">
                    {templates[selectedTemplate].description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {templates[selectedTemplate].volumes.map((vol, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white text-blue-700 text-xs rounded-md border border-blue-200">
                        {vol.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  创建项目并生成组卷
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">项目总数</p>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">进行中</p>
              <p className="text-2xl font-bold text-gray-900">
                {projects.filter(p => {
                  const stats = getProjectStats(p.id);
                  return stats.uploaded < stats.total;
                }).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待处理问题</p>
              <p className="text-2xl font-bold text-gray-900">
                {projects.reduce((acc, p) => acc + getProjectStats(p.id).issues, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">项目列表</h3>
          <div className="text-xs text-gray-400 flex items-center space-x-1">
            <HardDrive className="w-3.5 h-3.5" />
            <span>数据保存在本地浏览器中</span>
          </div>
        </div>
        
        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h4>
            <p className="text-gray-500 mb-4">点击上方按钮创建第一个工程项目</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新建项目</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {projects.map((project) => {
              const stats = getProjectStats(project.id);
              const completionPercent = stats.total > 0 ? Math.round((stats.uploaded / stats.total) * 100) : 0;
              
              return (
                <div
                  key={project.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-semibold text-gray-900">{project.projectName}</h4>
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                          {project.projectType}
                        </span>
                        {stats.issues > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{stats.issues} 个问题</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <span className="text-gray-400">标段：</span>
                          <span>{project.section}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="text-gray-400">单位工程：</span>
                          <span>{project.unitProject}</span>
                        </span>
                        {project.subDivision && (
                          <span className="flex items-center space-x-1">
                            <span className="text-gray-400">分部分项：</span>
                            <span>{project.subDivision}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(project.createdAt)}</span>
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">资料完整度</span>
                          <span className={`font-semibold ${getCompletionColor(completionPercent)}`}>
                            {completionPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColor(completionPercent)}`}
                            style={{ width: `${completionPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>共 {stats.total} 项</span>
                          <span className="text-green-600">已上传 {stats.uploaded}</span>
                          <span className="text-gray-600">缺失 {stats.missing}</span>
                          {stats.issues > 0 && (
                            <span className="text-amber-600">问题 {stats.issues}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleExportProject(project.id, project.projectName)}
                        className="inline-flex items-center space-x-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                        title="导出项目备份"
                      >
                        <Download className="w-4 h-4" />
                        <span>导出</span>
                      </button>
                      <button
                        onClick={() => handleSelectProject(project.id)}
                        className="inline-flex items-center space-x-1 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                      >
                        <span>进入组卷</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('确定要删除该项目吗？此操作不可撤销。')) {
                            deleteProject(project.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除项目"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
