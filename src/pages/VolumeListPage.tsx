import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, 
  Upload, 
  File, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  FileText,
  FileImage,
  ScanLine,
  Edit3,
  Trash2,
  AlertTriangle,
  Info,
  Download,
  X,
  CheckCircle,
  HelpCircle,
  ListChecks,
  Layers,
  Copy,
  FileQuestion,
  ArrowRight,
  EyeOff,
  ChevronUp,
  MapPin
} from 'lucide-react';
import useProjectStore from '../store/useProjectStore';
import StatusBadge from '../components/StatusBadge';
import type { DocumentStatus, FileType, DocumentItem, PendingUpload } from '../types';

const VolumeListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentProjectId,
    currentVolumeId,
    setCurrentVolume,
    projects,
    volumes,
    categories,
    documents,
    pendingUploads,
    uploadDocument,
    updateDocumentStatus,
    updateDocumentNotes,
    updateDocumentFilePages,
    getProjectStats,
    batchUploadFiles,
    confirmPendingUpload,
    confirmAllPending,
    removePendingUpload,
    clearPendingUploads,
    updatePendingMatch,
    detectDuplicates,
    detectMisplacements,
    ignoreDuplicate,
    ignoreMisplacement,
    moveDocumentToCategory,
    moveFileToDocument,
  } = useProjectStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState<DocumentItem | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'PDF' as FileType,
    documentDate: '',
    pages: 1,
  });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchDragOver, setBatchDragOver] = useState(false);
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
  const [showIssuesPanel, setShowIssuesPanel] = useState(true);
  const [showAllDuplicates, setShowAllDuplicates] = useState(false);
  const [showAllMisplacements, setShowAllMisplacements] = useState(false);
  const [movingDupDocId, setMovingDupDocId] = useState<string | null>(null);
  const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<string>('');
  const [moveTargetDocId, setMoveTargetDocId] = useState<string>('');
  const [expandedMisId, setExpandedMisId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectVolumes = currentProjectId ? volumes[currentProjectId] || [] : [];
  const currentVolume = projectVolumes.find((v) => v.id === currentVolumeId);
  const volumeCategories = currentVolumeId ? categories[currentVolumeId] || [] : [];

  const matchedPending = useMemo(
    () => pendingUploads.filter((p) => p.matchedDocumentId),
    [pendingUploads]
  );
  const unmatchedPending = useMemo(
    () => pendingUploads.filter((p) => !p.matchedDocumentId),
    [pendingUploads]
  );

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

  const duplicates = useMemo(() => {
    if (!currentVolumeId) return [];
    return detectDuplicates(currentVolumeId);
  }, [currentVolumeId, detectDuplicates]);

  const misplacements = useMemo(() => {
    if (!currentVolumeId) return [];
    return detectMisplacements(currentVolumeId);
  }, [currentVolumeId, detectMisplacements]);

  const totalIssues = duplicates.length + misplacements.length;

  const handleIgnoreDuplicate = (dupId: string) => {
    if (window.confirm('确定要忽略此重复提醒吗？')) {
      ignoreDuplicate(dupId);
    }
  };

  const handleIgnoreMisplacement = (misId: string) => {
    if (window.confirm('确定要忽略此错放提醒吗？')) {
      ignoreMisplacement(misId);
    }
  };

  const handleMoveToCategory = (docId: string, toCatId: string) => {
    if (window.confirm('确定要将此文件移动到建议的分类吗？')) {
      moveDocumentToCategory(docId, toCatId);
    }
  };

  const handleMoveToDocument = (fromDocId: string, toDocId: string, dupId?: string) => {
    if (window.confirm('确定要将此文件移动到选定条目吗？原位置将恢复为未上传状态。')) {
      moveFileToDocument(fromDocId, toDocId, false);
      if (dupId) ignoreDuplicate(dupId);
      setMovingDupDocId(null);
      setMoveTargetCategoryId('');
      setMoveTargetDocId('');
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryStats = (categoryId: string) => {
    const docs = documents[categoryId] || [];
    const total = docs.length;
    const uploaded = docs.filter((d) => d.status === '已上传').length;
    const missing = docs.filter((d) => d.status === '未上传').length;
    const issues = docs.filter((d) => d.status !== '未上传' && d.status !== '已上传').length;
    return { total, uploaded, missing, issues };
  };

  const getVolumeStats = (volumeId: string) => {
    const cats = categories[volumeId] || [];
    let total = 0;
    let uploaded = 0;
    let missing = 0;
    let issues = 0;
    cats.forEach((cat) => {
      const stats = getCategoryStats(cat.id);
      total += stats.total;
      uploaded += stats.uploaded;
      missing += stats.missing;
      issues += stats.issues;
    });
    return { total, uploaded, missing, issues };
  };

  const handleDragOver = (e: React.DragEvent, documentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(documentId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
  };

  const handleDrop = useCallback((e: React.DragEvent, document: DocumentItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      let fileType: FileType = 'PDF';
      if (file.type === 'application/pdf') {
        fileType = 'PDF';
      } else if (file.type.startsWith('image/')) {
        fileType = '照片';
      } else {
        fileType = '扫描件';
      }

      uploadDocument(document.id, {
        name: file.name,
        type: fileType,
        pages: 1,
      });
    }
  }, [uploadDocument]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, document: DocumentItem) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      let fileType: FileType = 'PDF';
      if (file.type === 'application/pdf') {
        fileType = 'PDF';
      } else if (file.type.startsWith('image/')) {
        fileType = '照片';
      } else {
        fileType = '扫描件';
      }

      uploadDocument(document.id, {
        name: file.name,
        type: fileType,
        pages: 1,
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openUploadModal = (document: DocumentItem) => {
    setShowUploadModal(document);
    setUploadForm({
      name: document.file?.name || document.name,
      type: document.file?.type || 'PDF',
      documentDate: document.file?.documentDate || new Date().toISOString().split('T')[0],
      pages: document.file?.pages ?? 1,
    });
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showUploadModal) {
      uploadDocument(showUploadModal.id, uploadForm);
      setShowUploadModal(null);
    }
  };

  const getStatusAction = (status: DocumentStatus) => {
    switch (status) {
      case '缺页':
        return { text: '修正页数', action: '已上传' as DocumentStatus };
      case '命名不规范':
        return { text: '重命名确认', action: '已上传' as DocumentStatus };
      case '日期倒挂':
        return { text: '确认日期', action: '已上传' as DocumentStatus };
      default:
        return null;
    }
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-500" />;
      case '照片':
        return <FileImage className="w-4 h-4 text-green-500" />;
      case '扫描件':
        return <ScanLine className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleNoteSave = (documentId: string) => {
    updateDocumentNotes(documentId, noteText);
    setEditingNoteId(null);
    setNoteText('');
  };

  const handleBatchDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragOver(true);
  };

  const handleBatchDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragOver(false);
  };

  const handleBatchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && currentVolumeId) {
      processBatchFiles(Array.from(files));
    }
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && currentVolumeId) {
      processBatchFiles(Array.from(files));
    }
    if (batchFileInputRef.current) {
      batchFileInputRef.current.value = '';
    }
  };

  const processBatchFiles = (files: File[]) => {
    const fileInfos = files.map((file) => {
      let fileType: FileType = 'PDF';
      if (file.type === 'application/pdf') {
        fileType = 'PDF';
      } else if (file.type.startsWith('image/')) {
        fileType = '照片';
      } else {
        fileType = '扫描件';
      }
      return {
        name: file.name,
        type: fileType,
        size: file.size,
        pages: undefined,
      };
    });

    if (currentVolumeId) {
      batchUploadFiles(currentVolumeId, fileInfos);
      setShowBatchUpload(true);
    }
  };

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-gray-500';
  };

  const getMatchScoreLabel = (score?: number) => {
    if (!score) return '待确认';
    if (score >= 90) return '高度匹配';
    if (score >= 70) return '可能匹配';
    return '低置信度';
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">案卷目录</h3>
            <p className="text-xs text-gray-500 mt-1">共 {projectVolumes.length} 卷</p>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
            {projectVolumes.map((volume) => {
              const volStats = getVolumeStats(volume.id);
              const completionPercent = volStats.total > 0 
                ? Math.round((volStats.uploaded / volStats.total) * 100) 
                : 0;
              
              return (
                <div
                  key={volume.id}
                  onClick={() => setCurrentVolume(volume.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    currentVolumeId === volume.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className={`w-4 h-4 ${
                        currentVolumeId === volume.id ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        currentVolumeId === volume.id ? 'text-primary-900' : 'text-gray-700'
                      }`}>
                        {volume.volumeNumber}
                      </span>
                    </div>
                    {volStats.issues > 0 && (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ml-6">{volume.name}</p>
                  <div className="ml-6 mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">
                        {volStats.uploaded}/{volStats.total}
                      </span>
                      <span className="text-gray-500">{completionPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          completionPercent >= 80 ? 'bg-green-500' :
                          completionPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">资料总数</span>
                <span className="font-medium text-gray-900">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">已上传</span>
                <span className="font-medium text-green-600">{stats.uploaded}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">缺失</span>
                <span className="font-medium text-gray-600">{stats.missing}</span>
              </div>
              {stats.issues > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-600 flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>待处理问题</span>
                  </span>
                  <span className="font-medium text-amber-600">{stats.issues}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/contents')}
              className="w-full mt-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>查看卷内目录</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-4">
        {!currentVolume ? (
          <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">请从左侧选择一个案卷</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {currentVolume.volumeNumber} {currentVolume.name}
                  </h3>
                  {currentVolume.description && (
                    <p className="text-sm text-gray-500 mt-1">{currentVolume.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    共 {volumeCategories.length} 个分类
                  </span>
                  <button
                    onClick={() => setShowBatchUpload(true)}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>批量导入</span>
                    {pendingUploads.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-white text-emerald-600 text-xs rounded-full font-medium">
                        {pendingUploads.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {totalIssues > 0 && showIssuesPanel && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-900">
                      发现 {totalIssues} 个归档问题
                    </span>
                  </div>
                  <button
                    onClick={() => setShowIssuesPanel(false)}
                    className="text-amber-500 hover:text-amber-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {duplicates.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-amber-800 flex items-center space-x-1">
                        <Copy className="w-4 h-4" />
                        <span>重复文件 ({duplicates.length})</span>
                      </h5>
                      {duplicates.length > 3 && (
                        <button
                          onClick={() => setShowAllDuplicates(!showAllDuplicates)}
                          className="text-xs text-amber-600 hover:text-amber-800 flex items-center space-x-1"
                        >
                          {showAllDuplicates ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              <span>收起</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              <span>查看全部</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(showAllDuplicates ? duplicates : duplicates.slice(0, 3)).map((dup) => (
                        <div
                          key={dup.id}
                          className="bg-white rounded-lg p-3 border border-amber-100"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {dup.fileName}
                              </p>
                              <div className="mt-2 space-y-1">
                                {dup.documentIds.map((docId, idx) => {
                                  const isMoving = movingDupDocId === docId;
                                  return (
                                    <div key={docId} className="text-xs">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <span className={idx === 0 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                                            {idx === 0 ? '✓ 保留' : '重复'} 「{dup.categoryNames[idx]}」- {dup.documentNames[idx]}
                                          </span>
                                        </div>
                                        {idx > 0 && !isMoving && (
                                          <button
                                            onClick={() => {
                                              setMovingDupDocId(docId);
                                            }}
                                            className="px-2 py-0.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors flex items-center space-x-1"
                                          >
                                            <MapPin className="w-3 h-3" />
                                            <span>移到其他条目</span>
                                          </button>
                                        )}
                                      </div>
                                      {isMoving && (
                                        <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                                          <div className="space-y-2">
                                            <select
                                              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                                              value={moveTargetCategoryId}
                                              onChange={(e) => {
                                                setMoveTargetCategoryId(e.target.value);
                                                setMoveTargetDocId('');
                                              }}
                                            >
                                              <option value="">选择分类...</option>
                                              {volumeCategories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                  {cat.name}
                                                </option>
                                              ))}
                                            </select>
                                            {moveTargetCategoryId && (
                                              <select
                                                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                                                value={moveTargetDocId}
                                                onChange={(e) => setMoveTargetDocId(e.target.value)}
                                              >
                                                <option value="">选择目标条目...</option>
                                                {(documents[moveTargetCategoryId] || []).map((d) => (
                                                  <option key={d.id} value={d.id}>
                                                    {d.name}
                                                    {d.status === '未上传' ? '（未上传）' : '（已上传）'}
                                                  </option>
                                                ))}
                                              </select>
                                            )}
                                            <div className="flex items-center justify-end space-x-2">
                                              <button
                                                onClick={() => {
                                                  setMovingDupDocId(null);
                                                  setMoveTargetCategoryId('');
                                                  setMoveTargetDocId('');
                                                }}
                                                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                              >
                                                取消
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (moveTargetDocId) {
                                                    handleMoveToDocument(docId, moveTargetDocId, dup.id);
                                                  }
                                                }}
                                                disabled={!moveTargetDocId}
                                                className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                确认移动
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                              <button
                                onClick={() => handleIgnoreDuplicate(dup.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                title="忽略此提醒"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {misplacements.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-amber-800 flex items-center space-x-1">
                        <FileQuestion className="w-4 h-4" />
                        <span>可能错放分类 ({misplacements.length})</span>
                      </h5>
                      {misplacements.length > 3 && (
                        <button
                          onClick={() => setShowAllMisplacements(!showAllMisplacements)}
                          className="text-xs text-amber-600 hover:text-amber-800 flex items-center space-x-1"
                        >
                          {showAllMisplacements ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              <span>收起</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              <span>查看全部</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(showAllMisplacements ? misplacements : misplacements.slice(0, 3)).map((mis) => {
                        const isExpanded = expandedMisId === mis.id;
                        return (
                          <div
                            key={mis.id}
                            className="bg-white rounded-lg p-3 border border-amber-100"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => setExpandedMisId(isExpanded ? null : mis.id)}
                                  className="w-full text-left"
                                >
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {mis.documentName}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1 text-xs">
                                    <span className="text-gray-500">{mis.currentCategoryName}</span>
                                    <ArrowRight className="w-3 h-3 text-amber-400" />
                                    <span className="text-amber-600 font-medium">{mis.suggestedCategoryName}</span>
                                  </div>
                                  {isExpanded && (
                                    <>
                                      <p className="text-xs text-gray-400 mt-1">
                                        {mis.reason}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        置信度: {mis.confidence}%
                                      </p>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                                <button
                                  onClick={() => handleMoveToCategory(mis.documentId, mis.suggestedCategoryId)}
                                  className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                                >
                                  移到建议分类
                                </button>
                                <button
                                  onClick={() => handleIgnoreMisplacement(mis.id)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                  title="忽略此提醒"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {totalIssues > 0 && !showIssuesPanel && (
              <button
                onClick={() => setShowIssuesPanel(true)}
                className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm flex items-center justify-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>显示 {totalIssues} 个归档问题</span>
              </button>
            )}

            {showBatchUpload && pendingUploads.length > 0 && (
              <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ListChecks className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-medium text-emerald-900">待确认上传</h4>
                      <p className="text-xs text-emerald-700">
                        共 {pendingUploads.length} 份文件，已匹配 {matchedPending.length} 份，待确认 {unmatchedPending.length} 份
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {matchedPending.length > 0 && (
                      <button
                        onClick={confirmAllPending}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>一键确认匹配</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        clearPendingUploads();
                        setShowBatchUpload(false);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="关闭"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {matchedPending.length > 0 && (
                    <div className="p-3">
                      <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>已匹配 ({matchedPending.length})</span>
                      </h5>
                      <div className="space-y-2">
                        {matchedPending.map((pending) => (
                          <PendingItem
                            key={pending.id}
                            pending={pending}
                            selected={selectedPendingId === pending.id}
                            onSelect={() => setSelectedPendingId(
                              selectedPendingId === pending.id ? null : pending.id
                            )}
                            onConfirm={() => confirmPendingUpload(pending.id, pending.matchedDocumentId!)}
                            onRemove={() => removePendingUpload(pending.id)}
                            getMatchScoreColor={getMatchScoreColor}
                            getMatchScoreLabel={getMatchScoreLabel}
                            volumeCategories={volumeCategories}
                            documents={documents}
                            onUpdateMatch={(docId) => updatePendingMatch(pending.id, docId)}
                            getFileIcon={getFileIcon}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {unmatchedPending.length > 0 && (
                    <div className="p-3 border-t border-gray-100 bg-amber-50/50">
                      <h5 className="text-xs font-semibold text-amber-600 uppercase mb-2 flex items-center space-x-1">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>未匹配 ({unmatchedPending.length}) - 请手动指定对应条目</span>
                      </h5>
                      <div className="space-y-2">
                        {unmatchedPending.map((pending) => (
                          <PendingItem
                            key={pending.id}
                            pending={pending}
                            selected={selectedPendingId === pending.id}
                            onSelect={() => setSelectedPendingId(
                              selectedPendingId === pending.id ? null : pending.id
                            )}
                            onConfirm={() => {}}
                            onRemove={() => removePendingUpload(pending.id)}
                            getMatchScoreColor={getMatchScoreColor}
                            getMatchScoreLabel={getMatchScoreLabel}
                            volumeCategories={volumeCategories}
                            documents={documents}
                            onUpdateMatch={(docId) => updatePendingMatch(pending.id, docId)}
                            getFileIcon={getFileIcon}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showBatchUpload && pendingUploads.length === 0 && (
              <div
                onDragOver={handleBatchDragOver}
                onDragLeave={handleBatchDragLeave}
                onDrop={handleBatchDrop}
                className={`bg-white rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  batchDragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                }`}
              >
                <Upload className={`w-10 h-10 mx-auto mb-3 ${
                  batchDragOver ? 'text-primary-500' : 'text-gray-400'
                }`} />
                <p className="text-gray-700 font-medium">拖拽多份文件到此处批量导入</p>
                <p className="text-sm text-gray-500 mt-1">
                  系统会自动按文件名与资料条目做初步匹配
                </p>
                <input
                  ref={batchFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
                  onChange={handleBatchFileSelect}
                />
                <button
                  onClick={() => batchFileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  选择文件
                </button>
                <button
                  onClick={() => setShowBatchUpload(false)}
                  className="mt-2 ml-2 px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  返回清单
                </button>
              </div>
            )}

            {!showBatchUpload && (
              <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
                  {volumeCategories.map((category) => {
                    const catStats = getCategoryStats(category.id);
                    const isExpanded = expandedCategories.has(category.id);
                    const categoryDocs = documents[category.id] || [];

                    return (
                      <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                            <div className="text-left">
                              <h4 className="font-medium text-gray-900">{category.name}</h4>
                              {category.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-green-600">{catStats.uploaded}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-gray-600">{catStats.total}</span>
                            </div>
                            {catStats.issues > 0 && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                {catStats.issues} 问题
                              </span>
                            )}
                            {catStats.missing > 0 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {catStats.missing} 缺失
                              </span>
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="divide-y divide-gray-100">
                            {categoryDocs.sort((a, b) => a.order - b.order).map((doc) => {
                              const statusAction = getStatusAction(doc.status);
                              const isDragOver = dragOverId === doc.id;

                              return (
                                <div
                                  key={doc.id}
                                  onDragOver={(e) => handleDragOver(e, doc.id)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, doc)}
                                  className={`p-4 hover:bg-gray-50 transition-colors ${
                                    isDragOver ? 'drag-over border-2 border-dashed' : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <span className={`w-2 h-2 rounded-full ${
                                          doc.required ? 'bg-red-500' : 'bg-gray-300'
                                        }`} />
                                        <span className="font-medium text-gray-900">{doc.name}</span>
                                        <span className="text-xs text-gray-400">
                                          {doc.required ? '必选' : '可选'}
                                        </span>
                                      </div>

                                      {doc.file && (
                                        <div className="mt-2 flex items-center flex-wrap gap-2 text-sm text-gray-600">
                                          {getFileIcon(doc.file.type)}
                                          <span className="text-gray-700">{doc.file.name}</span>
                                          {doc.file.pages !== undefined && (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                              doc.file.pages === 0 || doc.status === '缺页'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}>
                                              {doc.file.pages} 页
                                            </span>
                                          )}
                                          {doc.file.documentDate && (
                                            <span className="text-gray-500">
                                              日期: {doc.file.documentDate}
                                            </span>
                                          )}
                                          <span className="text-gray-400 text-xs">
                                            上传于 {new Date(doc.file.uploadDate).toLocaleDateString('zh-CN')}
                                          </span>
                                        </div>
                                      )}

                                      {doc.notes && (
                                        <div className="mt-2 flex items-start space-x-2 text-sm text-gray-600 bg-amber-50 p-2 rounded">
                                          <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                          <span>{doc.notes}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <StatusBadge status={doc.status} />
                                      
                                      {statusAction && doc.file && doc.status === '缺页' && (
                                        <div className="flex items-center space-x-1">
                                          <input
                                            type="number"
                                            min="1"
                                            value={doc.file.pages ?? 1}
                                            onChange={(e) => {
                                              const pages = parseInt(e.target.value) || 0;
                                              updateDocumentFilePages(doc.id, pages);
                                            }}
                                            className="w-16 px-2 py-1 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            title="修正页数"
                                          />
                                          <button
                                            onClick={() => updateDocumentStatus(doc.id, '已上传')}
                                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                          >
                                            确认
                                          </button>
                                        </div>
                                      )}
                                      {statusAction && doc.status !== '缺页' && (
                                        <button
                                          onClick={() => updateDocumentStatus(doc.id, statusAction.action)}
                                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                        >
                                          {statusAction.text}
                                        </button>
                                      )}

                                      {editingNoteId === doc.id ? (
                                        <div className="flex items-center space-x-1">
                                          <input
                                            type="text"
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            placeholder="输入备注..."
                                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleNoteSave(doc.id)}
                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={() => setEditingNoteId(null)}
                                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingNoteId(doc.id);
                                            setNoteText(doc.notes || '');
                                          }}
                                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                          title="添加备注"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                      )}

                                      {doc.status === '未上传' ? (
                                        <div className="flex items-center space-x-1">
                                          <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
                                            onChange={(e) => handleFileSelect(e, doc)}
                                          />
                                          <button
                                            onClick={() => openUploadModal(doc)}
                                            className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-1"
                                          >
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>上传</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => openUploadModal(doc)}
                                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                          title="编辑文件信息"
                                        >
                                          <File className="w-4 h-4" />
                                        </button>
                                      )}

                                      <button
                                        onClick={() => updateDocumentStatus(doc.id, '未上传')}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="移除文件"
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
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {showUploadModal.file ? '编辑资料信息' : '上传资料'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{showUploadModal.name}</p>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件名称
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件类型
                </label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as FileType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="PDF">PDF</option>
                  <option value="照片">照片</option>
                  <option value="扫描件">扫描件</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件日期
                </label>
                <input
                  type="date"
                  value={uploadForm.documentDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  页数
                  {uploadForm.pages === 0 && (
                    <span className="text-red-500 ml-2 text-xs">（页数为 0 将标记为缺页）</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  value={uploadForm.pages}
                  onChange={(e) => setUploadForm({ ...uploadForm, pages: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    uploadForm.pages === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {uploadForm.pages === 0 && (
                  <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>页数不能为 0，请填写正确的页数</span>
                  </p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">命名规范提示</p>
                    <p className="mt-1 text-amber-700">
                      文件名应包含：工程名称、资料类别、日期等信息，避免使用特殊字符。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  确认
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface PendingItemProps {
  pending: PendingUpload;
  selected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  onRemove: () => void;
  getMatchScoreColor: (score?: number) => string;
  getMatchScoreLabel: (score?: number) => string;
  volumeCategories: { id: string; name: string }[];
  documents: Record<string, DocumentItem[]>;
  onUpdateMatch: (docId: string) => void;
  getFileIcon: (type: FileType) => React.ReactNode;
}

const PendingItem: React.FC<PendingItemProps> = ({
  pending,
  selected,
  onSelect,
  onConfirm,
  onRemove,
  getMatchScoreColor,
  getMatchScoreLabel,
  volumeCategories,
  documents,
  onUpdateMatch,
  getFileIcon,
}) => {
  const allAvailableDocs = useMemo(() => {
    const docs: { id: string; name: string; categoryName: string }[] = [];
    volumeCategories.forEach((cat) => {
      const catDocs = documents[cat.id] || [];
      catDocs.forEach((doc) => {
        docs.push({ id: doc.id, name: doc.name, categoryName: cat.name });
      });
    });
    return docs;
  }, [volumeCategories, documents]);

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        selected ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {getFileIcon(pending.type)}
            <span className="text-sm font-medium text-gray-900 truncate">{pending.name}</span>
          </div>
          
          {pending.matchedDocumentName ? (
            <div className="mt-2 ml-6 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span className="text-gray-600">匹配到：</span>
                <span className="font-medium text-gray-900 truncate">
                  {pending.matchedDocumentName}
                </span>
              </div>
              <div className="mt-1 ml-5.5 flex items-center space-x-2 text-xs">
                <span className={`font-medium ${getMatchScoreColor(pending.matchScore)}`}>
                  {getMatchScoreLabel(pending.matchScore)}
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{pending.matchCategoryName}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 ml-6">
              <div className="flex items-center space-x-2 text-sm text-amber-600">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>未找到匹配项，请手动选择</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
          {pending.matchedDocumentId ? (
            <button
              onClick={onConfirm}
              className="px-2.5 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors"
            >
              确认
            </button>
          ) : (
            <button
              onClick={onSelect}
              className="px-2.5 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
            >
              指定
            </button>
          )}
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            选择对应的资料条目
          </label>
          <select
            value={pending.matchedDocumentId || ''}
            onChange={(e) => onUpdateMatch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            size={5}
          >
            {allAvailableDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                [{doc.categoryName}] {doc.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default VolumeListPage;
