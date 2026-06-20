import React, { useState, useRef, useCallback } from 'react';
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
  Download
} from 'lucide-react';
import useProjectStore from '../store/useProjectStore';
import StatusBadge from '../components/StatusBadge';
import type { DocumentStatus, FileType, DocumentItem } from '../types';

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
    uploadDocument,
    updateDocumentStatus,
    updateDocumentNotes,
    getProjectStats,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectVolumes = currentProjectId ? volumes[currentProjectId] || [] : [];
  const currentVolume = projectVolumes.find((v) => v.id === currentVolumeId);
  const volumeCategories = currentVolumeId ? categories[currentVolumeId] || [] : [];

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
      name: document.name,
      type: 'PDF',
      documentDate: new Date().toISOString().split('T')[0],
      pages: 1,
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
        return { text: '补全页码', action: '已上传' as DocumentStatus };
      case '命名不规范':
        return { text: '重命名', action: '已上传' as DocumentStatus };
      case '日期倒挂':
        return { text: '修正日期', action: '已上传' as DocumentStatus };
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

      <div className="flex-1 overflow-hidden">
        {!currentVolume ? (
          <div className="h-full flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">请从左侧选择一个案卷</p>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200">
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
                </div>
              </div>
            </div>

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
                                    <div className="mt-2 flex items-center space-x-3 text-sm text-gray-600">
                                      {getFileIcon(doc.file.type)}
                                      <span className="text-gray-700">{doc.file.name}</span>
                                      {doc.file.pages && (
                                        <span className="text-gray-500">{doc.file.pages}页</span>
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
                                  
                                  {statusAction && (
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
                                      title="重新上传"
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
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {showUploadModal.file ? '重新上传资料' : '上传资料'}
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
                </label>
                <input
                  type="number"
                  min="1"
                  value={uploadForm.pages}
                  onChange={(e) => setUploadForm({ ...uploadForm, pages: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
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
                  确认上传
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeListPage;
