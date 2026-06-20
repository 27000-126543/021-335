import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  FileText, 
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  BookOpen,
  FileSpreadsheet,
  Settings,
  Printer
} from 'lucide-react';
import useProjectStore from '../store/useProjectStore';
import StatusBadge from '../components/StatusBadge';
import type { DocumentItem } from '../types';

type ViewMode = 'directory' | 'cover' | 'checklist';

const VolumeContentsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentProjectId,
    currentVolumeId,
    projects,
    volumes,
    categories,
    documents,
    updateDocumentPageNumber,
    reorderDocuments,
    reorderVolumes,
    generateChecklist,
    getProjectStats,
  } = useProjectStore();

  const [viewMode, setViewMode] = useState<ViewMode>('directory');
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | null>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectVolumes = currentProjectId ? volumes[currentProjectId] || [] : [];
  const activeVolumeId = selectedVolumeId || currentVolumeId || projectVolumes[0]?.id;
  const activeVolume = projectVolumes.find((v) => v.id === activeVolumeId);
  const volumeCategories = activeVolumeId ? categories[activeVolumeId] || [] : [];
  const checklist = currentProjectId ? generateChecklist(currentProjectId) : [];

  if (!currentProject || !currentProjectId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择项目</h3>
        <p className="text-gray-500 mb-6">请在项目首页创建或选择一个工程项目</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          前往项目首页
        </button>
      </div>
    );
  }

  const stats = getProjectStats(currentProjectId);

  const allDocuments = useMemo(() => {
    const docs: (DocumentItem & { categoryName: string })[] = [];
    volumeCategories.forEach((cat) => {
      const catDocs = documents[cat.id] || [];
      catDocs.sort((a, b) => a.order - b.order).forEach((doc) => {
        docs.push({ ...doc, categoryName: cat.name });
      });
    });
    return docs;
  }, [volumeCategories, documents]);

  const uploadedDocuments = allDocuments.filter((d) => d.status === '已上传');

  const autoAssignPageNumbers = () => {
    let currentPage = 1;
    allDocuments.forEach((doc) => {
      if (doc.status === '已上传') {
        const pages = doc.file?.pages || 1;
        updateDocumentPageNumber(doc.id, currentPage);
        currentPage += pages;
      }
    });
  };

  const moveDocument = (documentId: string, direction: 'up' | 'down') => {
    const cat = volumeCategories.find((c) => {
      const docs = documents[c.id] || [];
      return docs.some((d) => d.id === documentId);
    });
    if (!cat) return;

    const docs = [...(documents[cat.id] || [])].sort((a, b) => a.order - b.order);
    const currentIndex = docs.findIndex((d) => d.id === documentId);
    
    if (direction === 'up' && currentIndex > 0) {
      [docs[currentIndex], docs[currentIndex - 1]] = [docs[currentIndex - 1], docs[currentIndex]];
    } else if (direction === 'down' && currentIndex < docs.length - 1) {
      [docs[currentIndex], docs[currentIndex + 1]] = [docs[currentIndex + 1], docs[currentIndex]];
    }
    
    reorderDocuments(cat.id, docs.map((d) => d.id));
  };

  const moveVolume = (volumeId: string, direction: 'up' | 'down') => {
    const vols = [...projectVolumes].sort((a, b) => a.order - b.order);
    const currentIndex = vols.findIndex((v) => v.id === volumeId);
    
    if (direction === 'up' && currentIndex > 0) {
      [vols[currentIndex], vols[currentIndex - 1]] = [vols[currentIndex - 1], vols[currentIndex]];
    } else if (direction === 'down' && currentIndex < vols.length - 1) {
      [vols[currentIndex], vols[currentIndex + 1]] = [vols[currentIndex + 1], vols[currentIndex]];
    }
    
    reorderVolumes(currentProjectId, vols.map((v) => v.id));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已完成':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case '待检查':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case '有问题':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const exportChecklist = () => {
    const headers = ['检查项目', '是否必选', '检查状态', '备注'];
    const rows = checklist.map((item) => [
      item.name,
      item.required ? '是' : '否',
      item.status,
      item.remark || '',
    ]);

    const csvContent = [
      ['档案馆移交检查清单'],
      [`工程名称: ${currentProject.projectName}`],
      [`标段: ${currentProject.section}`],
      [`单位工程: ${currentProject.unitProject}`],
      [`导出日期: ${new Date().toLocaleDateString('zh-CN')}`],
      [],
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `档案馆检查清单_${currentProject.projectName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportDirectory = () => {
    const content = generateDirectoryText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `卷内目录_${activeVolume?.name || '案卷'}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const generateDirectoryText = () => {
    const lines: string[] = [];
    
    lines.push('卷 内 目 录');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`工程名称: ${currentProject.projectName}`);
    lines.push(`标段: ${currentProject.section}`);
    lines.push(`单位工程: ${currentProject.unitProject}`);
    lines.push(`案卷名称: ${activeVolume?.name || ''}`);
    lines.push(`案卷编号: ${activeVolume?.volumeNumber || ''}`);
    lines.push('');
    lines.push('-'.repeat(80));
    lines.push('');
    lines.push('序号\t起止页号\t文件名称\t\t编制单位\t编制日期');
    lines.push('-'.repeat(80));

    let seqNo = 1;
    volumeCategories.forEach((cat) => {
      lines.push('');
      lines.push(`【${cat.name}】`);
      
      const docs = (documents[cat.id] || [])
        .filter((d) => d.status === '已上传')
        .sort((a, b) => a.order - b.order);
      
      docs.forEach((doc) => {
        const startPage = doc.pageNumber || '-';
        const pages = doc.file?.pages || 1;
        const endPage = doc.pageNumber ? doc.pageNumber + pages - 1 : '-';
        const pageRange = startPage === endPage ? `${startPage}` : `${startPage}-${endPage}`;
        const date = doc.file?.documentDate || '-';
        
        lines.push(
          `${seqNo}\t${pageRange}\t\t${doc.name}\t\t-\t${date}`
        );
        seqNo++;
      });
    });

    lines.push('');
    lines.push('='.repeat(80));
    lines.push(`编制人: __________\t\t审核人: __________\t\t编制日期: __________`);

    return lines.join('\n');
  };

  const printCover = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/volumes')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">卷内目录</h2>
            <p className="text-sm text-gray-500 mt-1">
              预览、调整顺序、管理页码，导出移交清单
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('directory')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'directory'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>目录预览</span>
            </button>
            <button
              onClick={() => setViewMode('cover')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'cover'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>封面/备考表</span>
            </button>
            <button
              onClick={() => setViewMode('checklist')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'checklist'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>检查清单</span>
            </button>
          </div>

          {viewMode === 'directory' && (
            <button
              onClick={exportDirectory}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>导出目录</span>
            </button>
          )}
          {viewMode === 'cover' && (
            <button
              onClick={printCover}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>打印封面</span>
            </button>
          )}
          {viewMode === 'checklist' && (
            <button
              onClick={exportChecklist}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>导出检查清单</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">案卷总数</p>
              <p className="text-2xl font-bold text-gray-900">{projectVolumes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已编入目录</p>
              <p className="text-2xl font-bold text-gray-900">{uploadedDocuments.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.issues}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Eye className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">完整度</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total > 0 ? Math.round((stats.uploaded / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'directory' && (
        <div className="flex gap-6 h-[calc(100vh-320px)]">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">选择案卷</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
                {projectVolumes.sort((a, b) => a.order - b.order).map((volume, idx) => (
                  <div key={volume.id}>
                    <div
                      onClick={() => setSelectedVolumeId(volume.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        activeVolumeId === volume.id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${
                            activeVolumeId === volume.id ? 'text-primary-900' : 'text-gray-700'
                          }`}>
                            {volume.volumeNumber}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveVolume(volume.id, 'up');
                            }}
                            disabled={idx === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveVolume(volume.id, 'down');
                            }}
                            disabled={idx === projectVolumes.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 ml-0">{volume.name}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={autoAssignPageNumbers}
                  className="w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>自动编排页码</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {!activeVolume ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">请从左侧选择一个案卷</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {activeVolume.volumeNumber} {activeVolume.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      共 {uploadedDocuments.length} 份文件已编入目录
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    点击上下箭头调整顺序
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                          序号
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          分类
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          文件名称
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                          状态
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                          编制日期
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                          起止页号
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allDocuments.map((doc, idx) => {
                        const startPage = doc.pageNumber || '';
                        const pages = doc.file?.pages || 1;
                        const endPage = doc.pageNumber ? doc.pageNumber + pages - 1 : '';
                        
                        return (
                          <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                {doc.categoryName}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  doc.required ? 'bg-red-500' : 'bg-gray-300'
                                }`} />
                                <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                              </div>
                              {doc.file && (
                                <p className="text-xs text-gray-500 mt-1 ml-4">
                                  {doc.file.name} ({doc.file.type})
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={doc.status} size="sm" />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {doc.file?.documentDate || '-'}
                            </td>
                            <td className="px-4 py-3">
                              {doc.status === '已上传' ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={startPage}
                                  onChange={(e) => updateDocumentPageNumber(doc.id, parseInt(e.target.value) || 0)}
                                  placeholder="页码"
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                              {startPage && endPage && startPage !== endPage && (
                                <span className="text-sm text-gray-500 ml-1">- {endPage}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => moveDocument(doc.id, 'up')}
                                  disabled={idx === 0}
                                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveDocument(doc.id, 'down')}
                                  disabled={idx === allDocuments.length - 1}
                                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'cover' && (
        <div className="flex gap-6">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="max-w-2xl mx-auto" id="cover-preview">
              <div className="text-center border-2 border-gray-300 p-12 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  建设工程竣工档案
                </h1>
                <div className="w-32 h-1 bg-primary-600 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-800 mb-8">
                  {currentProject.projectType}工程
                </h2>
                
                <div className="space-y-4 text-left text-lg">
                  <div className="flex">
                    <span className="w-32 text-gray-600">工程名称：</span>
                    <span className="font-medium text-gray-900">{currentProject.projectName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-gray-600">标段：</span>
                    <span className="font-medium text-gray-900">{currentProject.section}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-gray-600">单位工程：</span>
                    <span className="font-medium text-gray-900">{currentProject.unitProject}</span>
                  </div>
                  {currentProject.subDivision && (
                    <div className="flex">
                      <span className="w-32 text-gray-600">分部分项：</span>
                      <span className="font-medium text-gray-900">{currentProject.subDivision}</span>
                    </div>
                  )}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-200">
                  <p className="text-gray-500 text-sm">案卷名称</p>
                  <p className="text-xl font-semibold text-gray-900 mt-2">
                    {activeVolume?.name || projectVolumes[0]?.name}
                  </p>
                  <p className="text-lg text-gray-600 mt-1">
                    {activeVolume?.volumeNumber || projectVolumes[0]?.volumeNumber}
                  </p>
                </div>

                <div className="mt-12 flex justify-between text-sm text-gray-500">
                  <div>
                    <p>编制单位：____________________</p>
                    <p className="mt-2">编制人：__________</p>
                  </div>
                  <div className="text-right">
                    <p>编制日期：__________</p>
                    <p className="mt-2">保管期限：长期</p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-gray-300 p-8">
                <h3 className="text-xl font-bold text-center text-gray-900 mb-6">备考表</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      本卷情况说明
                    </label>
                    <div className="w-full h-32 border border-gray-300 rounded p-3 text-gray-600">
                      本卷共有文件材料 {uploadedDocuments.length} 件，
                      {allDocuments.reduce((acc, d) => acc + (d.file?.pages || 0), 0)} 页。
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        立卷人
                      </label>
                      <div className="h-10 border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        立卷日期
                      </label>
                      <div className="h-10 border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        检查人
                      </label>
                      <div className="h-10 border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        检查日期
                      </label>
                      <div className="h-10 border border-gray-300 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'checklist' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">档案馆移交检查清单</h3>
            <p className="text-sm text-gray-500 mt-1">
              以下是移交档案馆前需要检查的项目，请逐一核对
            </p>
          </div>

          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">检查说明</p>
                  <p className="mt-1">
                    本清单根据《建设工程文件归档规范》GB/T 50328-2014 编制，用于竣工资料移交前的自检。
                    请根据实际情况核对，确保所有必选项目均已完成。
                  </p>
                </div>
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                    序号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    检查项目
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                    必选
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                    检查状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">
                    备注
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checklist.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.required ? (
                        <span className="w-2 h-2 bg-red-500 rounded-full inline-block" title="必选" />
                      ) : (
                        <span className="w-2 h-2 bg-gray-300 rounded-full inline-block" title="可选" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-1">
                        {getStatusIcon(item.status)}
                        <span className={`text-sm font-medium ${
                          item.status === '已完成' ? 'text-green-600' :
                          item.status === '待检查' ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.remark || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {checklist.filter((c) => c.status === '已完成').length}
                  </p>
                  <p className="text-sm text-green-700">已完成</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-600">
                    {checklist.filter((c) => c.status === '待检查').length}
                  </p>
                  <p className="text-sm text-amber-700">待检查</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    {checklist.filter((c) => c.status === '有问题').length}
                  </p>
                  <p className="text-sm text-red-700">有问题</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeContentsPage;
