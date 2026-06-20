export type ProjectType = '房建' | '市政' | '装修';

export type DocumentStatus = 
  | '未上传' 
  | '已上传' 
  | '缺页' 
  | '命名不规范' 
  | '日期倒挂';

export type FileType = 'PDF' | '照片' | '扫描件';

export interface ProjectInfo {
  id: string;
  projectName: string;
  section: string;
  unitProject: string;
  subDivision: string;
  projectType: ProjectType;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  categoryId: string;
  name: string;
  required: boolean;
  status: DocumentStatus;
  file?: {
    name: string;
    type: FileType;
    uploadDate: string;
    documentDate?: string;
    pages?: number;
  };
  pageNumber?: number;
  notes?: string;
  order: number;
  globalOrder?: number;
}

export interface Category {
  id: string;
  volumeId: string;
  name: string;
  description?: string;
  order: number;
}

export interface Volume {
  id: string;
  projectId: string;
  name: string;
  volumeNumber: string;
  description?: string;
  order: number;
}

export interface Template {
  type: ProjectType;
  name: string;
  description: string;
  volumes: {
    name: string;
    description?: string;
    categories: {
      name: string;
      description?: string;
      documents: {
        name: string;
        required: boolean;
      }[];
    }[];
  }[];
}

export interface ArchiveCheckItem {
  name: string;
  required: boolean;
  status: '已完成' | '待检查' | '有问题';
  remark?: string;
}

export interface PendingUpload {
  id: string;
  name: string;
  type: FileType;
  size?: number;
  documentDate?: string;
  pages?: number;
  matchedDocumentId?: string;
  matchedDocumentName?: string;
  matchScore?: number;
  matchCategoryId?: string;
  matchCategoryName?: string;
}

export interface ProjectBackup {
  version: string;
  exportedAt: string;
  project: ProjectInfo;
  volumes: Volume[];
  categories: Record<string, Category[]>;
  documents: Record<string, DocumentItem[]>;
}

export interface DirectoryVersion {
  id: string;
  volumeId: string;
  name: string;
  description: string;
  createdAt: string;
  documentSnapshots: {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
    order: number;
    globalOrder: number;
    pageNumber?: number;
    filePages?: number;
    notes?: string;
    status: DocumentStatus;
  }[];
}

export interface VersionDiffItem {
  documentId: string;
  documentName: string;
  categoryName: string;
  changeType: 'order' | 'page' | 'notes' | 'added' | 'removed' | 'category';
  oldValue?: string | number;
  newValue?: string | number;
}

export interface DuplicateFile {
  id: string;
  fileName: string;
  fileType: FileType;
  documentIds: string[];
  documentNames: string[];
  categoryNames: string[];
}

export interface MisplacedFile {
  id: string;
  documentId: string;
  documentName: string;
  currentCategoryId: string;
  currentCategoryName: string;
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  reason: string;
  confidence: number;
}

export type IssueType = 'missing' | '缺页' | '未编页码' | '页码重叠' | '日期倒挂' | '命名不规范' | '重复文件' | '错放分类';

export interface IssueDetail {
  id: string;
  type: IssueType;
  volumeId: string;
  volumeName: string;
  categoryId: string;
  categoryName: string;
  documentId: string;
  documentName: string;
  description: string;
}

export interface IssueSummary {
  type: IssueType;
  label: string;
  count: number;
  issues: IssueDetail[];
}
