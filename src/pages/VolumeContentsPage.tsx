import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Printer,
  GripVertical,
  Layers,
  Save,
  History,
  GitCompare,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  X,
  FileWarning,
  Package,
  Undo2
} from 'lucide-react';
import useProjectStore from '../store/useProjectStore';
import StatusBadge from '../components/StatusBadge';
import type { IssueDetail, IssueSummary } from '../types';

type ViewMode = 'directory' | 'cover' | 'checklist' | 'package';

const VolumeContentsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentProjectId,
    currentVolumeId,
    projects,
    volumes,
    updateDocumentPageNumber,
    reorderDocumentsInVolume,
    reorderVolumes,
    generateChecklist,
    getProjectStats,
    getVolumeDocuments,
    getIssueSummaries,
    saveDirectoryVersion,
    getVolumeVersions,
    restoreVersion,
    compareVersions,
    deleteVersion,
    getLatestRestoreRecord,
    undoRestore,
  } = useProjectStore();

  const [viewMode, setViewMode] = useState<ViewMode>('directory');
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionDesc, setVersionDesc] = useState('');
  const [compareVersion1, setCompareVersion1] = useState<string | null>(null);
  const [compareVersion2, setCompareVersion2] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [expandedIssueTypes, setExpandedIssueTypes] = useState<Set<string>>(new Set());
  const [highlightDocId, setHighlightDocId] = useState<string | null>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectVolumes = currentProjectId ? volumes[currentProjectId] || [] : [];
  const activeVolumeId = selectedVolumeId || currentVolumeId || projectVolumes[0]?.id;
  const activeVolume = projectVolumes.find((v) => v.id === activeVolumeId);
  const checklist = currentProjectId ? generateChecklist(currentProjectId) : [];

  const stats = currentProjectId ? getProjectStats(currentProjectId) : { total: 0, uploaded: 0, missing: 0, issues: 0 };

  const allDocuments = useMemo(() => {
    if (!activeVolumeId) return [];
    return getVolumeDocuments(activeVolumeId);
  }, [activeVolumeId, getVolumeDocuments]);

  const uploadedDocuments = allDocuments.filter((d) => d.status === '已上传');

  const versions = useMemo(() => {
    if (!activeVolumeId) return [];
    return getVolumeVersions(activeVolumeId);
  }, [activeVolumeId, getVolumeVersions]);

  const issueSummaries = useMemo(() => {
    if (!currentProjectId) return [];
    return getIssueSummaries(currentProjectId);
  }, [currentProjectId, getIssueSummaries]);

  const compareDiffs = useMemo(() => {
    if (!compareVersion1 || !compareVersion2) return [];
    return compareVersions(compareVersion1, compareVersion2);
  }, [compareVersion1, compareVersion2, compareVersions]);

  const handleSaveVersion = () => {
    if (!activeVolumeId || !versionName.trim()) return;
    saveDirectoryVersion(activeVolumeId, versionName.trim(), versionDesc.trim());
    setShowSaveVersionModal(false);
    setVersionName('');
    setVersionDesc('');
  };

  const handleRestoreVersion = (versionId: string) => {
    if (window.confirm('确定要恢复到此版本吗？当前的修改将被覆盖。')) {
      restoreVersion(versionId);
    }
  };

  const handleDeleteVersion = (versionId: string) => {
    if (window.confirm('确定要删除此版本吗？删除后不可恢复。')) {
      deleteVersion(versionId);
    }
  };

  const latestRestoreRecord = useMemo(() => {
    if (!activeVolumeId) return null;
    return getLatestRestoreRecord(activeVolumeId);
  }, [activeVolumeId, getLatestRestoreRecord]);

  const handleUndoRestore = () => {
    if (!latestRestoreRecord) return;
    if (window.confirm('确定要撤回到恢复前的状态吗？')) {
      undoRestore(latestRestoreRecord.id);
    }
  };

  const startCompare = (versionId: string) => {
    if (!compareVersion1) {
      setCompareVersion1(versionId);
    } else if (!compareVersion2 && versionId !== compareVersion1) {
      setCompareVersion2(versionId);
      setShowCompareModal(true);
    } else {
      setCompareVersion1(versionId);
      setCompareVersion2(null);
    }
  };

  const toggleIssueType = (type: string) => {
    const newExpanded = new Set(expandedIssueTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedIssueTypes(newExpanded);
  };

  const handleJumpToIssue = (issue: IssueDetail) => {
    if (issue.volumeId) {
      setSelectedVolumeId(issue.volumeId);
      setViewMode('directory');
      setHighlightDocId(issue.documentId);
    }
  };

  useEffect(() => {
    if (!highlightDocId) return;
    const timer = setTimeout(() => {
      setHighlightDocId(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [highlightDocId]);

  useEffect(() => {
    if (!highlightDocId || !tableRef.current) return;
    const el = tableRef.current.querySelector(`[data-doc-id="${highlightDocId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightDocId, activeVolumeId, allDocuments]);

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'order': return '顺序变化';
      case 'page': return '页码变化';
      case 'notes': return '备注变化';
      case 'category': return '分类变化';
      case 'added': return '新增文件';
      case 'removed': return '移除文件';
      default: return type;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'order': return 'text-blue-600 bg-blue-50';
      case 'page': return 'text-amber-600 bg-amber-50';
      case 'notes': return 'text-purple-600 bg-purple-50';
      case 'category': return 'text-pink-600 bg-pink-50';
      case 'added': return 'text-green-600 bg-green-50';
      case 'removed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

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

  const autoAssignPageNumbers = () => {
    if (!activeVolumeId) return;
    let currentPage = 1;
    allDocuments.forEach((doc) => {
      if (doc.status === '已上传') {
        const pages = doc.file?.pages || 1;
        updateDocumentPageNumber(doc.id, currentPage);
        currentPage += pages;
      }
    });
  };

  const moveDocument = (fromIndex: number, toIndex: number) => {
    if (!activeVolumeId) return;
    if (toIndex < 0 || toIndex >= allDocuments.length) return;
    if (fromIndex === toIndex) return;

    const newOrder = [...allDocuments];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    const docIds = newOrder.map((d) => d.id);
    reorderDocumentsInVolume(activeVolumeId, docIds);
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

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      moveDocument(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
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
    lines.push('序号\t分类\t文件名称\t\t起止页号\t编制日期');
    lines.push('-'.repeat(80));

    let seqNo = 1;
    allDocuments
      .filter((d) => d.status === '已上传')
      .forEach((doc) => {
        const startPage = doc.pageNumber || '-';
        const pages = doc.file?.pages || 1;
        const endPage = doc.pageNumber ? doc.pageNumber + pages - 1 : '-';
        const pageRange = startPage === endPage ? `${startPage}` : `${startPage}-${endPage}`;
        const date = doc.file?.documentDate || '-';
        
        lines.push(
          `${seqNo}\t${doc.categoryName}\t${doc.name}\t\t${pageRange}\t${date}`
        );
        seqNo++;
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
            <button
              onClick={() => setViewMode('package')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'package'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>移交包预览</span>
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
          {viewMode === 'package' && (
            <button
              onClick={() => {
                const parts: string[] = [];
                if (currentProject && activeVolume) {
                  parts.push(`案卷封面 - ${activeVolume.volumeNumber} ${activeVolume.name}`);
                  parts.push(generateDirectoryText());
                  const issues = issueSummaries.filter((s) =>
                    s.issues.some((i) => i.volumeId === activeVolumeId)
                  );
                  parts.push(`\n\n问题清单\n${'='.repeat(80)}\n`);
                  issues.forEach((s) => {
                    parts.push(`\n【${s.label}】共 ${s.count} 项：`);
                    s.issues
                      .filter((i) => i.volumeId === activeVolumeId)
                      .forEach((issue) => {
                        parts.push(`  · ${issue.documentName} - ${issue.description}`);
                      });
                  });
                  parts.push(`\n\n检查清单\n${'='.repeat(80)}\n`);
                  checklist.forEach((item, idx) => {
                    parts.push(`${idx + 1}. ${item.name} - ${item.status}${item.remark ? ' - ' + item.remark : ''}`);
                  });
                }
                const content = parts.join('\n');
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `移交包_${activeVolume?.name || '案卷'}_${new Date().toISOString().split('T')[0]}.txt`;
                link.click();
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>导出移交包</span>
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
                          <Layers className={`w-4 h-4 ${
                            activeVolumeId === volume.id ? 'text-primary-600' : 'text-gray-400'
                          }`} />
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
                      <p className="text-sm text-gray-600 mt-1 ml-6">{volume.name}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
                {latestRestoreRecord && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-blue-800">
                        <p className="font-medium">已恢复到「{latestRestoreRecord.versionName}」</p>
                        <p className="text-blue-600 mt-0.5">
                          {new Date(latestRestoreRecord.restoredAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={handleUndoRestore}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="撤回到恢复前状态"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={autoAssignPageNumbers}
                  className="w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>自动编排页码</span>
                </button>
                <button
                  onClick={() => setShowSaveVersionModal(true)}
                  className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>保存版本</span>
                </button>
                <button
                  onClick={() => setShowVersionPanel(!showVersionPanel)}
                  className="w-full py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <History className="w-4 h-4" />
                  <span>历史版本 ({versions.length})</span>
                </button>
                <div className="text-xs text-gray-500 text-center">
                  拖拽行或用箭头调整顺序
                </div>
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
                      共 {allDocuments.length} 份文件，已上传 {uploadedDocuments.length} 份
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center space-x-1">
                    <GripVertical className="w-4 h-4" />
                    <span>拖拽行可调整顺序</span>
                  </div>
                </div>

                <div ref={tableRef} className="flex-1 overflow-y-auto scrollbar-thin">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-10">
                          <span className="sr-only">拖拽</span>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                          序号
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                          分类
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          文件名称
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                          状态
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                          编制日期
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                          起止页号
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allDocuments.map((doc, idx) => {
                        const startPage = doc.pageNumber || '';
                        const pages = doc.file?.pages || 1;
                        const endPage = doc.pageNumber ? doc.pageNumber + pages - 1 : '';
                        const isDragging = dragIndex === idx;
                        const isDragOver = dragOverIndex === idx && dragIndex !== idx;
                        
                        return (
                          <tr
                            key={doc.id}
                            data-doc-id={doc.id}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={(e) => handleDrop(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`transition-all cursor-move select-none ${
                              isDragging ? 'opacity-50 bg-primary-50' : ''
                            } ${
                              isDragOver ? 'border-t-2 border-primary-500 bg-primary-50/50' : ''
                            } ${
                              highlightDocId === doc.id ? 'bg-amber-100 ring-2 ring-amber-400 ring-inset' : ''
                            } hover:bg-gray-50`}
                          >
                            <td className="px-3 py-2.5">
                              <GripVertical className="w-4 h-4 text-gray-300" />
                            </td>
                            <td className="px-3 py-2.5 text-sm text-gray-500 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                {doc.categoryName}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  doc.required ? 'bg-red-500' : 'bg-gray-300'
                                }`} />
                                <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                              </div>
                              {doc.file && (
                                <p className="text-xs text-gray-500 mt-0.5 ml-4">
                                  {doc.file.name} ({doc.file.type})
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusBadge status={doc.status} size="sm" />
                            </td>
                            <td className="px-3 py-2.5 text-sm text-gray-600">
                              {doc.file?.documentDate || '-'}
                            </td>
                            <td className="px-3 py-2.5">
                              {doc.status === '已上传' ? (
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    min="1"
                                    value={startPage}
                                    onChange={(e) => updateDocumentPageNumber(doc.id, parseInt(e.target.value) || 0)}
                                    placeholder="起页"
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                  />
                                  {startPage && endPage && startPage !== endPage && (
                                    <span className="text-sm text-gray-500">至 {endPage}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-center space-x-0.5">
                                <button
                                  onClick={() => moveDocument(idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="上移"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveDocument(idx, idx + 1)}
                                  disabled={idx === allDocuments.length - 1}
                                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="下移"
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
        <div className="space-y-6">
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">问题明细汇总</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    按问题类型分类统计，点击可跳转到对应资料
                  </p>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                  共 {issueSummaries.reduce((acc, s) => acc + s.count, 0)} 个问题
                </span>
              </div>
            </div>

            <div className="p-6">
              {issueSummaries.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">太棒了！当前没有发现问题</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issueSummaries.map((summary) => {
                    const isExpanded = expandedIssueTypes.has(summary.type);
                    return (
                      <div key={summary.type} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleIssueType(summary.type)}
                          className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                            <FileWarning className="w-5 h-5 text-amber-500" />
                            <span className="font-medium text-gray-900">{summary.label}</span>
                          </div>
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                            {summary.count} 项
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="divide-y divide-gray-100">
                            {summary.issues.map((issue) => (
                              <div
                                key={issue.id}
                                className="p-3 hover:bg-amber-50 cursor-pointer transition-colors"
                                onClick={() => handleJumpToIssue(issue)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {issue.documentName}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                        {issue.volumeName}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                        {issue.categoryName}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-amber-600">
                                      {issue.description}
                                    </p>
                                  </div>
                                  <span className="text-xs text-primary-600 flex items-center space-x-1 flex-shrink-0 ml-3">
                                    <span>跳转</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSaveVersionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">保存目录版本</h3>
                <button
                  onClick={() => {
                    setShowSaveVersionModal(false);
                    setVersionName('');
                    setVersionDesc('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  版本名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="例如：初稿、设计院审查后、移交版"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  版本说明
                </label>
                <textarea
                  value={versionDesc}
                  onChange={(e) => setVersionDesc(e.target.value)}
                  placeholder="记录本次版本的主要变更内容..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium">提示</p>
                <p className="mt-1">
                  版本将保存当前目录的文件顺序、页码、备注等信息，后续可随时恢复或对比。
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveVersionModal(false);
                  setVersionName('');
                  setVersionDesc('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveVersion}
                disabled={!versionName.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存版本
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">历史版本</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    共 {versions.length} 个版本 · 选择两个版本可对比差异
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowVersionPanel(false);
                    setCompareVersion1(null);
                    setCompareVersion2(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {versions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无历史版本</p>
                  <p className="text-sm text-gray-400 mt-1">点击「保存版本」创建第一个版本</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => {
                    const isSelected1 = compareVersion1 === version.id;
                    const isSelected2 = compareVersion2 === version.id;
                    return (
                      <div
                        key={version.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected1 || isSelected2
                            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => startCompare(version.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{version.name}</span>
                              {isSelected1 && (
                                <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded">
                                  版本 A
                                </span>
                              )}
                              {isSelected2 && (
                                <span className="px-2 py-0.5 text-xs bg-pink-500 text-white rounded">
                                  版本 B
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {version.description || '无版本说明'}
                            </p>
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
                              <span>
                                {new Date(version.createdAt).toLocaleString('zh-CN')}
                              </span>
                              <span>
                                {version.documentSnapshots.length} 个文件
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreVersion(version.id);
                              }}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="恢复此版本"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVersion(version.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除此版本"
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
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {compareVersion1 && !compareVersion2 && '请再选择一个版本进行对比'}
                  {compareVersion1 && compareVersion2 && '已选择两个版本，可查看对比'}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setCompareVersion1(null);
                      setCompareVersion2(null);
                    }}
                    disabled={!compareVersion1 && !compareVersion2}
                    className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    清除选择
                  </button>
                  <button
                    onClick={() => setShowCompareModal(true)}
                    disabled={!compareVersion1 || !compareVersion2}
                    className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <GitCompare className="w-4 h-4" />
                    <span>对比差异</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCompareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">版本对比</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    共 {compareDiffs.length} 处变更
                  </p>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {compareDiffs.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">两个版本完全一致，没有差异</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {compareDiffs.map((diff, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getChangeTypeColor(diff.changeType)}`}>
                              {getChangeTypeLabel(diff.changeType)}
                            </span>
                            <span className="font-medium text-gray-900 text-sm">
                              {diff.documentName}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            分类：{diff.categoryName}
                          </div>
                        </div>
                      </div>
                      {(diff.oldValue !== undefined || diff.newValue !== undefined) && (
                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                          {diff.oldValue !== undefined && (
                            <div className="p-2 bg-red-50 rounded">
                              <p className="text-xs text-red-500 mb-1">变更前</p>
                              <p className="text-red-700 font-mono">{String(diff.oldValue)}</p>
                            </div>
                          )}
                          {diff.newValue !== undefined && (
                            <div className="p-2 bg-green-50 rounded">
                              <p className="text-xs text-green-500 mb-1">变更后</p>
                              <p className="text-green-700 font-mono">{String(diff.newValue)}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'package' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <Package className="w-5 h-5 text-primary-600" />
                    <span>移交包预览</span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    查看案卷完整内容：封面信息、卷内目录、检查清单、问题清单
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-6">
                <h4 className="text-base font-semibold text-primary-900 mb-4 flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>案卷封面信息</span>
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-primary-600">工程名称：</span>
                    <span className="text-primary-900 font-medium">{currentProject?.projectName}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">标段：</span>
                    <span className="text-primary-900 font-medium">{currentProject?.section}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">单位工程：</span>
                    <span className="text-primary-900 font-medium">{currentProject?.unitProject}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">分部分项：</span>
                    <span className="text-primary-900 font-medium">{currentProject?.subDivision}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">案卷号：</span>
                    <span className="text-primary-900 font-medium">{activeVolume?.volumeNumber}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">案卷名称：</span>
                    <span className="text-primary-900 font-medium">{activeVolume?.name}</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-2xl font-bold text-primary-700">{allDocuments.length}</p>
                    <p className="text-xs text-primary-600">文件总数</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-600">{uploadedDocuments.length}</p>
                    <p className="text-xs text-green-700">已上传</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-2xl font-bold text-red-600">{stats.missing}</p>
                    <p className="text-xs text-red-700">未上传</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-2xl font-bold text-amber-600">{stats.issues}</p>
                    <p className="text-xs text-amber-700">待处理问题</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h4 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                    <span>卷内目录（共 {uploadedDocuments.length} 份已上传）</span>
                  </h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 w-12">序号</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 w-28">分类</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">文件名称</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 w-24">状态</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 w-24">起止页</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allDocuments.map((doc, idx) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{doc.categoryName}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 font-medium">{doc.name}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={doc.status} />
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 font-mono">
                            {doc.status === '已上传' && doc.pageNumber
                              ? `${doc.pageNumber}-${doc.pageNumber + (doc.file?.pages || 1) - 1}`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h4 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-gray-600" />
                      <span>档案馆检查清单</span>
                    </h4>
                  </div>
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-700 flex items-center space-x-2">
                          {item.required && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
                          <span>{item.name}</span>
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.status === '已完成'
                            ? 'bg-green-100 text-green-700'
                            : item.status === '待检查'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-gray-600" />
                      <span>本卷问题清单</span>
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      issueSummaries.filter((s) => s.issues.some((i) => i.volumeId === activeVolumeId)).length > 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {issueSummaries.reduce((acc, s) => acc + s.issues.filter((i) => i.volumeId === activeVolumeId).length, 0)} 项
                    </span>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    {issueSummaries.filter((s) => s.issues.some((i) => i.volumeId === activeVolumeId)).length === 0 ? (
                      <div className="text-center py-6">
                        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">本卷没有待处理问题</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {issueSummaries
                          .filter((s) => s.issues.some((i) => i.volumeId === activeVolumeId))
                          .map((summary: IssueSummary) => (
                            <div key={summary.type}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium text-gray-700">{summary.label}</span>
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                  {summary.issues.filter((i) => i.volumeId === activeVolumeId).length} 项
                                </span>
                              </div>
                              <div className="pl-2 space-y-1">
                                {summary.issues
                                  .filter((i) => i.volumeId === activeVolumeId)
                                  .slice(0, 3)
                                  .map((issue) => (
                                    <div key={issue.id} className="text-xs text-gray-600 truncate">
                                      · {issue.documentName} - {issue.description}
                                    </div>
                                  ))}
                                {summary.issues.filter((i) => i.volumeId === activeVolumeId).length > 3 && (
                                  <div className="text-xs text-gray-400">
                                    还有 {summary.issues.filter((i) => i.volumeId === activeVolumeId).length - 3} 项...
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
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
