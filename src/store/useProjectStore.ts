import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ProjectInfo, 
  Volume, 
  Category, 
  DocumentItem, 
  DocumentStatus, 
  ProjectType, 
  FileType, 
  ArchiveCheckItem,
  PendingUpload,
  ProjectBackup,
  DirectoryVersion,
  VersionDiffItem,
  DuplicateFile,
  MisplacedFile,
  IssueDetail,
  IssueSummary,
  IssueType
} from '../types';
import { templates, createId } from '../data/templates';

const NAME_PATTERN = /^[A-Za-z0-9\u4e00-\u9fa5_\-\s\.]+$/;

const computeDocumentStatus = (
  file: { name: string; type: FileType; documentDate?: string; pages?: number },
  existingDoc?: DocumentItem
): DocumentStatus => {
  if (file.pages !== undefined && (file.pages === 0 || file.pages < 1)) {
    return '缺页';
  }

  if (!NAME_PATTERN.test(file.name)) {
    return '命名不规范';
  }

  if (file.documentDate && existingDoc?.file?.documentDate) {
    const newDate = new Date(file.documentDate);
    const existingDate = new Date(existingDoc.file.documentDate);
    if (newDate < existingDate) {
      return '日期倒挂';
    }
  }

  return '已上传';
};

const findDocumentById = (
  allDocs: Record<string, DocumentItem[]>,
  documentId: string
): { categoryId: string; index: number; doc: DocumentItem } | null => {
  for (const categoryId of Object.keys(allDocs)) {
    const idx = allDocs[categoryId].findIndex((d) => d.id === documentId);
    if (idx !== -1) {
      return { categoryId, index: idx, doc: allDocs[categoryId][idx] };
    }
  }
  return null;
};

interface ProjectState {
  projects: ProjectInfo[];
  volumes: Record<string, Volume[]>;
  categories: Record<string, Category[]>;
  documents: Record<string, DocumentItem[]>;
  currentProjectId: string | null;
  currentVolumeId: string | null;
  pendingUploads: PendingUpload[];
  directoryVersions: DirectoryVersion[];
  ignoredDuplicates: string[];
  ignoredMisplacements: string[];
  
  createProject: (data: Omit<ProjectInfo, 'id' | 'createdAt'>) => ProjectInfo;
  deleteProject: (projectId: string) => void;
  setCurrentProject: (projectId: string | null) => void;
  setCurrentVolume: (volumeId: string | null) => void;
  
  generateVolumeStructure: (projectId: string, type: ProjectType) => void;
  
  uploadDocument: (
    documentId: string,
    file: { name: string; type: FileType; documentDate?: string; pages?: number }
  ) => void;
  
  updateDocumentStatus: (documentId: string, status: DocumentStatus) => void;
  updateDocumentNotes: (documentId: string, notes: string) => void;
  updateDocumentPageNumber: (documentId: string, pageNumber: number) => void;
  updateDocumentFilePages: (documentId: string, pages: number) => void;
  
  reorderDocuments: (categoryId: string, documentIds: string[]) => void;
  reorderDocumentsInVolume: (volumeId: string, documentIdsInOrder: string[]) => void;
  moveDocumentAcrossCategories: (
    documentId: string,
    fromCategoryId: string,
    toCategoryId: string,
    toIndex: number
  ) => void;
  
  reorderVolumes: (projectId: string, volumeIds: string[]) => void;
  reorderCategories: (volumeId: string, categoryIds: string[]) => void;
  
  getVolumeDocuments: (volumeId: string) => (DocumentItem & { categoryName: string })[];
  
  getProjectStats: (projectId: string) => {
    total: number;
    uploaded: number;
    missing: number;
    issues: number;
  };
  
  generateChecklist: (projectId: string) => ArchiveCheckItem[];
  
  batchUploadFiles: (
    volumeId: string,
    files: { name: string; type: FileType; size?: number; documentDate?: string; pages?: number }[]
  ) => void;
  confirmPendingUpload: (pendingId: string, targetDocumentId: string) => void;
  confirmAllPending: () => void;
  removePendingUpload: (pendingId: string) => void;
  clearPendingUploads: () => void;
  updatePendingMatch: (pendingId: string, targetDocumentId: string) => void;
  
  exportProjectBackup: (projectId: string) => ProjectBackup;
  importProjectBackup: (backup: ProjectBackup) => void;
  
  saveDirectoryVersion: (volumeId: string, name: string, description: string) => DirectoryVersion;
  getVolumeVersions: (volumeId: string) => DirectoryVersion[];
  restoreVersion: (versionId: string) => void;
  compareVersions: (versionId1: string, versionId2: string) => VersionDiffItem[];
  deleteVersion: (versionId: string) => void;
  
  detectDuplicates: (volumeId: string) => DuplicateFile[];
  detectMisplacements: (volumeId: string) => MisplacedFile[];
  ignoreDuplicate: (duplicateId: string) => void;
  ignoreMisplacement: (misplacementId: string) => void;
  moveDocumentToCategory: (documentId: string, toCategoryId: string) => void;
  
  getProjectIssues: (projectId: string) => IssueDetail[];
  getIssueSummaries: (projectId: string) => IssueSummary[];
  
  clearAll: () => void;
}

const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      volumes: {},
      categories: {},
      documents: {},
      currentProjectId: null,
      currentVolumeId: null,
      pendingUploads: [],
      directoryVersions: [],
      ignoredDuplicates: [],
      ignoredMisplacements: [],

      createProject: (data) => {
        const project: ProjectInfo = {
          ...data,
          id: createId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          projects: [...state.projects, project],
        }));
        return project;
      },

      deleteProject: (projectId) => {
        set((state) => {
          const newVolumes = { ...state.volumes };
          const newCategories = { ...state.categories };
          const newDocuments = { ...state.documents };
          
          const projectVolumes = state.volumes[projectId] || [];
          projectVolumes.forEach((vol) => {
            const volCats = state.categories[vol.id] || [];
            volCats.forEach((cat) => {
              delete newDocuments[cat.id];
            });
            delete newCategories[vol.id];
          });
          delete newVolumes[projectId];
          
          return {
            projects: state.projects.filter((p) => p.id !== projectId),
            volumes: newVolumes,
            categories: newCategories,
            documents: newDocuments,
            currentProjectId: state.currentProjectId === projectId ? null : state.currentProjectId,
            currentVolumeId: state.currentProjectId === projectId ? null : state.currentVolumeId,
          };
        });
      },

      setCurrentProject: (projectId) => {
        set({ currentProjectId: projectId, currentVolumeId: null, pendingUploads: [] });
      },

      setCurrentVolume: (volumeId) => {
        set({ currentVolumeId: volumeId, pendingUploads: [] });
      },

      generateVolumeStructure: (projectId, type) => {
        const template = templates[type];
        const volumes: Volume[] = [];
        const categories: Record<string, Category[]> = {};
        const documents: Record<string, DocumentItem[]> = {};

        template.volumes.forEach((vol, volIndex) => {
          const volumeId = createId();
          volumes.push({
            id: volumeId,
            projectId,
            name: vol.name,
            volumeNumber: `第${volIndex + 1}卷`,
            description: vol.description,
            order: volIndex,
          });

          categories[volumeId] = [];
          vol.categories.forEach((cat, catIndex) => {
            const categoryId = createId();
            categories[volumeId].push({
              id: categoryId,
              volumeId,
              name: cat.name,
              description: cat.description,
              order: catIndex,
            });

            documents[categoryId] = [];
            cat.documents.forEach((doc, docIndex) => {
              documents[categoryId].push({
                id: createId(),
                categoryId,
                name: doc.name,
                required: doc.required,
                status: '未上传',
                order: docIndex,
              });
            });
          });
        });

        set((state) => ({
          volumes: { ...state.volumes, [projectId]: volumes },
          categories: { ...state.categories, ...categories },
          documents: { ...state.documents, ...documents },
        }));
      },

      uploadDocument: (documentId, file) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          const found = findDocumentById(newDocuments, documentId);
          if (!found) return { documents: newDocuments };

          const existingDoc = found.doc;
          const status = computeDocumentStatus(file, existingDoc);

          newDocuments[found.categoryId][found.index] = {
            ...existingDoc,
            status,
            file: {
              ...file,
              uploadDate: new Date().toISOString(),
            },
          };

          return { documents: newDocuments };
        });
      },

      updateDocumentStatus: (documentId, status) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          const found = findDocumentById(newDocuments, documentId);
          if (!found) return { documents: newDocuments };

          newDocuments[found.categoryId][found.index] = {
            ...found.doc,
            status,
          };
          return { documents: newDocuments };
        });
      },

      updateDocumentNotes: (documentId, notes) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          const found = findDocumentById(newDocuments, documentId);
          if (!found) return { documents: newDocuments };

          newDocuments[found.categoryId][found.index] = {
            ...found.doc,
            notes,
          };
          return { documents: newDocuments };
        });
      },

      updateDocumentPageNumber: (documentId, pageNumber) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          const found = findDocumentById(newDocuments, documentId);
          if (!found) return { documents: newDocuments };

          newDocuments[found.categoryId][found.index] = {
            ...found.doc,
            pageNumber,
          };
          return { documents: newDocuments };
        });
      },

      updateDocumentFilePages: (documentId, pages) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          const found = findDocumentById(newDocuments, documentId);
          if (!found || !found.doc.file) return { documents: newDocuments };

          const updatedFile = { ...found.doc.file, pages };
          const newStatus = computeDocumentStatus(updatedFile, found.doc);

          newDocuments[found.categoryId][found.index] = {
            ...found.doc,
            file: updatedFile,
            status: newStatus,
          };
          return { documents: newDocuments };
        });
      },

      reorderDocuments: (categoryId, documentIds) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          if (!newDocuments[categoryId]) return { documents: newDocuments };

          const reordered = documentIds.map((id, index) => {
            const doc = newDocuments[categoryId].find((d) => d.id === id);
            return doc ? { ...doc, order: index } : null;
          }).filter(Boolean) as DocumentItem[];

          newDocuments[categoryId] = reordered;
          return { documents: newDocuments };
        });
      },

      reorderDocumentsInVolume: (volumeId, documentIdsInOrder) => {
        set((state) => {
          const volCategories = state.categories[volumeId] || [];
          const newDocuments = { ...state.documents };
          
          const docMap = new Map<string, DocumentItem & { originalCategoryId: string }>();
          volCategories.forEach((cat) => {
            const docs = newDocuments[cat.id] || [];
            docs.forEach((doc) => {
              docMap.set(doc.id, { ...doc, originalCategoryId: cat.id });
            });
          });

          let globalIndex = 0;
          const categoryDocs: Record<string, DocumentItem[]> = {};
          volCategories.forEach((cat) => {
            categoryDocs[cat.id] = [];
          });

          documentIdsInOrder.forEach((docId) => {
            const doc = docMap.get(docId);
            if (doc) {
              const catId = doc.categoryId;
              if (categoryDocs[catId]) {
                categoryDocs[catId].push({
                  ...doc,
                  order: categoryDocs[catId].length,
                  globalOrder: globalIndex,
                });
                globalIndex++;
              }
            }
          });

          volCategories.forEach((cat) => {
            if (newDocuments[cat.id]) {
              newDocuments[cat.id] = categoryDocs[cat.id] || [];
            }
          });

          return { documents: newDocuments };
        });
      },

      moveDocumentAcrossCategories: (documentId, fromCategoryId, toCategoryId, toIndex) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          if (!newDocuments[fromCategoryId] || !newDocuments[toCategoryId]) {
            return { documents: newDocuments };
          }

          const docIndex = newDocuments[fromCategoryId].findIndex((d) => d.id === documentId);
          if (docIndex === -1) return { documents: newDocuments };

          const [movedDoc] = newDocuments[fromCategoryId].splice(docIndex, 1);
          const updatedDoc = { ...movedDoc, categoryId: toCategoryId };

          const targetArray = [...newDocuments[toCategoryId]];
          targetArray.splice(toIndex, 0, updatedDoc);
          targetArray.forEach((d, i) => { d.order = i; });
          
          newDocuments[fromCategoryId].forEach((d, i) => { d.order = i; });
          newDocuments[toCategoryId] = targetArray;

          return { documents: newDocuments };
        });
      },

      reorderVolumes: (projectId, volumeIds) => {
        set((state) => {
          const newVolumes = { ...state.volumes };
          if (!newVolumes[projectId]) return { volumes: newVolumes };

          const reordered = volumeIds.map((id, index) => {
            const vol = newVolumes[projectId].find((v) => v.id === id);
            return vol ? { ...vol, order: index, volumeNumber: `第${index + 1}卷` } : null;
          }).filter(Boolean) as Volume[];

          newVolumes[projectId] = reordered;
          return { volumes: newVolumes };
        });
      },

      reorderCategories: (volumeId, categoryIds) => {
        set((state) => {
          const newCategories = { ...state.categories };
          if (!newCategories[volumeId]) return { categories: newCategories };

          const reordered = categoryIds.map((id, index) => {
            const cat = newCategories[volumeId].find((c) => c.id === id);
            return cat ? { ...cat, order: index } : null;
          }).filter(Boolean) as Category[];

          newCategories[volumeId] = reordered;
          return { categories: newCategories };
        });
      },

      getVolumeDocuments: (volumeId) => {
        const state = get();
        const volCategories = state.categories[volumeId] || [];
        const docs: (DocumentItem & { categoryName: string })[] = [];
        const catOrderMap = new Map(volCategories.map((c, idx) => [c.id, idx]));
        
        volCategories.forEach((cat) => {
          const catDocs = state.documents[cat.id] || [];
          catDocs.forEach((doc) => {
            docs.push({ ...doc, categoryName: cat.name });
          });
        });

        docs.sort((a, b) => {
          const aCatOrder = catOrderMap.get(a.categoryId) ?? 0;
          const bCatOrder = catOrderMap.get(b.categoryId) ?? 0;
          const aOrder = a.globalOrder ?? (a.order + aCatOrder * 1000);
          const bOrder = b.globalOrder ?? (b.order + bCatOrder * 1000);
          return aOrder - bOrder;
        });

        return docs;
      },

      getProjectStats: (projectId) => {
        const state = get();
        const projectVolumes = state.volumes[projectId] || [];
        let total = 0;
        let uploaded = 0;
        let missing = 0;
        let issues = 0;

        projectVolumes.forEach((vol) => {
          const cats = state.categories[vol.id] || [];
          cats.forEach((cat) => {
            const docs = state.documents[cat.id] || [];
            docs.forEach((doc) => {
              total++;
              if (doc.status === '已上传') {
                uploaded++;
              } else if (doc.status === '未上传') {
                missing++;
              } else {
                issues++;
              }
            });
          });
        });

        return { total, uploaded, missing, issues };
      },

      generateChecklist: (projectId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === projectId);
        const projectVolumes = state.volumes[projectId] || [];
        const checklist: ArchiveCheckItem[] = [];

        checklist.push({
          name: '工程名称、标段、单位工程信息完整',
          required: true,
          status: project && project.projectName && project.section && project.unitProject ? '已完成' : '待检查',
        });

        checklist.push({
          name: '施工许可证已上传',
          required: true,
          status: '待检查',
        });

        checklist.push({
          name: '图纸会审记录完整',
          required: true,
          status: '待检查',
        });

        checklist.push({
          name: '设计变更通知单齐全',
          required: true,
          status: '待检查',
        });

        const checkListCategories = [
          { name: '施工管理文件', required: true },
          { name: '质量控制资料', required: true },
          { name: '隐蔽验收记录', required: true },
          { name: '竣工图', required: true },
          { name: '验收记录', required: true },
        ];

        checkListCategories.forEach((catInfo) => {
          const volume = projectVolumes.find((v) => v.name === catInfo.name);
          if (volume) {
            const cats = state.categories[volume.id] || [];
            let hasMissing = false;
            let hasIssue = false;
            let totalDocs = 0;
            let uploadedDocs = 0;

            cats.forEach((cat) => {
              const docs = state.documents[cat.id] || [];
              docs.forEach((doc) => {
                if (doc.required) {
                  totalDocs++;
                  if (doc.status === '未上传') {
                    hasMissing = true;
                  } else if (doc.status === '已上传') {
                    uploadedDocs++;
                  } else {
                    hasIssue = true;
                  }
                }
              });
            });

            checklist.push({
              name: `${catInfo.name}完整性检查（${uploadedDocs}/${totalDocs}）`,
              required: catInfo.required,
              status: hasMissing ? '有问题' : hasIssue ? '待检查' : '已完成',
              remark: hasMissing ? '存在缺失资料' : hasIssue ? '存在问题资料需确认' : undefined,
            });
          }
        });

        const allDocs: DocumentItem[] = [];
        projectVolumes.forEach((vol) => {
          (state.categories[vol.id] || []).forEach((cat) => {
            allDocs.push(...(state.documents[cat.id] || []));
          });
        });
        const uploadedWithPages = allDocs.filter(
          (d) => d.status === '已上传' && d.pageNumber && d.pageNumber > 0
        );
        const hasPageNumbers = uploadedWithPages.length > 0 && 
          uploadedWithPages.length === allDocs.filter((d) => d.status === '已上传').length;

        checklist.push({
          name: '卷内目录编制完整',
          required: true,
          status: hasPageNumbers ? '已完成' : '待检查',
          remark: hasPageNumbers ? undefined : '部分已上传资料未编排页码',
        });

        checklist.push({
          name: '备考表填写完整',
          required: true,
          status: '待检查',
        });

        checklist.push({
          name: '封面信息准确',
          required: true,
          status: '待检查',
        });

        checklist.push({
          name: '页码连续无断档',
          required: true,
          status: hasPageNumbers ? '待检查' : '待检查',
        });

        checklist.push({
          name: '竣工图章加盖齐全',
          required: true,
          status: '待检查',
        });

        checklist.push({
          name: '签字盖章手续完备',
          required: true,
          status: '待检查',
        });

        const hasZeroPagesIssue = allDocs.some(
          (d) => d.status === '缺页' || (d.file?.pages === 0)
        );
        if (hasZeroPagesIssue) {
          checklist.push({
            name: '文件页数完整性检查',
            required: true,
            status: '有问题',
            remark: '存在标注为"缺页"的资料，请补充完整',
          });
        }

        return checklist;
      },

      batchUploadFiles: (volumeId, files) => {
        const state = get();
        const volCategories = state.categories[volumeId] || [];
        const allDocs: { doc: DocumentItem; categoryId: string; categoryName: string }[] = [];

        volCategories.forEach((cat) => {
          const docs = state.documents[cat.id] || [];
          docs.forEach((doc) => {
            allDocs.push({ doc, categoryId: cat.id, categoryName: cat.name });
          });
        });

        type MatchResult = {
          doc: DocumentItem;
          categoryId: string;
          categoryName: string;
          score: number;
        };

        const pending: PendingUpload[] = files.map((file) => {
          let bestMatch: MatchResult | null = null;

          const fileNameClean = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[_\-\s]+/g, '')
            .toLowerCase();

          for (const { doc, categoryId, categoryName } of allDocs) {
            const docNameClean = doc.name.replace(/[_\-\s]+/g, '').toLowerCase();
            
            let score = 0;
            if (docNameClean === fileNameClean) {
              score = 100;
            } else if (docNameClean.includes(fileNameClean) || fileNameClean.includes(docNameClean)) {
              score = 70;
            } else {
              let commonChars = 0;
              const shorter = fileNameClean.length < docNameClean.length ? fileNameClean : docNameClean;
              const longer = fileNameClean.length >= docNameClean.length ? fileNameClean : docNameClean;
              for (const ch of shorter) {
                if (longer.includes(ch)) commonChars++;
              }
              score = Math.round((commonChars / longer.length) * 50);
            }

            if (score > 40 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { doc, categoryId, categoryName, score };
            }
          }

          const pendingItem: PendingUpload = {
            id: createId(),
            name: file.name,
            type: file.type,
            size: file.size,
            documentDate: file.documentDate,
            pages: file.pages,
          };

          if (bestMatch) {
            pendingItem.matchedDocumentId = bestMatch.doc.id;
            pendingItem.matchedDocumentName = bestMatch.doc.name;
            pendingItem.matchScore = bestMatch.score;
            pendingItem.matchCategoryId = bestMatch.categoryId;
            pendingItem.matchCategoryName = bestMatch.categoryName;
          }

          return pendingItem;
        });

        set((state) => ({
          pendingUploads: [...state.pendingUploads, ...pending],
        }));
      },

      confirmPendingUpload: (pendingId, targetDocumentId) => {
        const state = get();
        const pending = state.pendingUploads.find((p) => p.id === pendingId);
        if (!pending) return;

        get().uploadDocument(targetDocumentId, {
          name: pending.name,
          type: pending.type,
          documentDate: pending.documentDate,
          pages: pending.pages,
        });

        set((state) => ({
          pendingUploads: state.pendingUploads.filter((p) => p.id !== pendingId),
        }));
      },

      confirmAllPending: () => {
        const state = get();
        const matched = state.pendingUploads.filter((p) => p.matchedDocumentId);
        
        matched.forEach((pending) => {
          if (pending.matchedDocumentId) {
            get().uploadDocument(pending.matchedDocumentId, {
              name: pending.name,
              type: pending.type,
              documentDate: pending.documentDate,
              pages: pending.pages,
            });
          }
        });

        set((state) => ({
          pendingUploads: state.pendingUploads.filter((p) => !p.matchedDocumentId),
        }));
      },

      removePendingUpload: (pendingId) => {
        set((state) => ({
          pendingUploads: state.pendingUploads.filter((p) => p.id !== pendingId),
        }));
      },

      clearPendingUploads: () => {
        set({ pendingUploads: [] });
      },

      updatePendingMatch: (pendingId, targetDocumentId) => {
        const state = get();
        const pending = state.pendingUploads.find((p) => p.id === pendingId);
        if (!pending) return;

        let targetDoc: DocumentItem | null = null;
        let targetCategoryId = '';
        let targetCategoryName = '';

        const volCategories = state.currentVolumeId 
          ? state.categories[state.currentVolumeId] || [] 
          : [];

        for (const cat of volCategories) {
          const doc = (state.documents[cat.id] || []).find((d) => d.id === targetDocumentId);
          if (doc) {
            targetDoc = doc;
            targetCategoryId = cat.id;
            targetCategoryName = cat.name;
            break;
          }
        }

        if (targetDoc) {
          set((state) => ({
            pendingUploads: state.pendingUploads.map((p) =>
              p.id === pendingId
                ? {
                    ...p,
                    matchedDocumentId: targetDocumentId,
                    matchedDocumentName: targetDoc!.name,
                    matchScore: 100,
                    matchCategoryId: targetCategoryId,
                    matchCategoryName: targetCategoryName,
                  }
                : p
            ),
          }));
        }
      },

      exportProjectBackup: (projectId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === projectId);
        if (!project) throw new Error('Project not found');

        const projectVolumes = state.volumes[projectId] || [];
        const categories: Record<string, Category[]> = {};
        const documents: Record<string, DocumentItem[]> = {};

        projectVolumes.forEach((vol) => {
          categories[vol.id] = state.categories[vol.id] || [];
          (state.categories[vol.id] || []).forEach((cat) => {
            documents[cat.id] = state.documents[cat.id] || [];
          });
        });

        const backup: ProjectBackup = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          project,
          volumes: projectVolumes,
          categories,
          documents,
        };

        return backup;
      },

      importProjectBackup: (backup) => {
        set((state) => {
          const newId = createId();
          const idMap = new Map<string, string>();
          
          const importedProject: ProjectInfo = {
            ...backup.project,
            id: newId,
            createdAt: new Date().toISOString(),
          };

          const importedVolumes: Volume[] = backup.volumes.map((vol) => {
            const newVolId = createId();
            idMap.set(vol.id, newVolId);
            return { ...vol, id: newVolId, projectId: newId };
          });

          const importedCategories: Record<string, Category[]> = {};
          Object.entries(backup.categories).forEach(([oldVolId, cats]) => {
            const newVolId = idMap.get(oldVolId);
            if (newVolId) {
              importedCategories[newVolId] = cats.map((cat) => {
                const newCatId = createId();
                idMap.set(cat.id, newCatId);
                return { ...cat, id: newCatId, volumeId: newVolId };
              });
            }
          });

          const importedDocuments: Record<string, DocumentItem[]> = {};
          Object.entries(backup.documents).forEach(([oldCatId, docs]) => {
            const newCatId = idMap.get(oldCatId);
            if (newCatId) {
              importedDocuments[newCatId] = docs.map((doc) => ({
                ...doc,
                id: createId(),
                categoryId: newCatId,
              }));
            }
          });

          return {
            projects: [...state.projects, importedProject],
            volumes: { ...state.volumes, [newId]: importedVolumes },
            categories: { ...state.categories, ...importedCategories },
            documents: { ...state.documents, ...importedDocuments },
            currentProjectId: newId,
          };
        });
      },

      saveDirectoryVersion: (volumeId, name, description) => {
        const documents = get().getVolumeDocuments(volumeId);

        const version: DirectoryVersion = {
          id: createId(),
          volumeId,
          name,
          description,
          createdAt: new Date().toISOString(),
          documentSnapshots: documents.map((doc, idx) => ({
            id: doc.id,
            name: doc.name,
            categoryId: doc.categoryId,
            categoryName: doc.categoryName,
            order: doc.order,
            globalOrder: doc.globalOrder ?? idx,
            pageNumber: doc.pageNumber,
            filePages: doc.file?.pages,
            notes: doc.notes,
            status: doc.status,
          })),
        };

        set((state) => ({
          directoryVersions: [...state.directoryVersions, version],
        }));

        return version;
      },

      getVolumeVersions: (volumeId) => {
        return get().directoryVersions
          .filter((v) => v.volumeId === volumeId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      restoreVersion: (versionId) => {
        const state = get();
        const version = state.directoryVersions.find((v) => v.id === versionId);
        if (!version) return;

        const volCategories = state.categories[version.volumeId] || [];
        const newDocuments = { ...state.documents };

        volCategories.forEach((cat) => {
          newDocuments[cat.id] = [];
        });

        version.documentSnapshots.forEach((snapshot) => {
          const found = findDocumentById(state.documents, snapshot.id);
          if (found && newDocuments[snapshot.categoryId]) {
            const doc = { ...found.doc };
            doc.order = snapshot.order;
            doc.globalOrder = snapshot.globalOrder;
            doc.pageNumber = snapshot.pageNumber;
            doc.notes = snapshot.notes;
            if (doc.file) {
              doc.file = { ...doc.file, pages: snapshot.filePages };
            }
            newDocuments[snapshot.categoryId].push(doc);
          }
        });

        volCategories.forEach((cat) => {
          if (newDocuments[cat.id]) {
            newDocuments[cat.id].sort((a, b) => (a.globalOrder ?? a.order) - (b.globalOrder ?? b.order));
            newDocuments[cat.id].forEach((doc, idx) => {
              doc.order = idx;
            });
          }
        });

        set({ documents: newDocuments });
      },

      compareVersions: (versionId1, versionId2) => {
        const state = get();
        const v1 = state.directoryVersions.find((v) => v.id === versionId1);
        const v2 = state.directoryVersions.find((v) => v.id === versionId2);
        if (!v1 || !v2) return [];

        const diffs: VersionDiffItem[] = [];
        const v1Map = new Map(v1.documentSnapshots.map((s) => [s.id, s]));
        const v2Map = new Map(v2.documentSnapshots.map((s) => [s.id, s]));

        v2.documentSnapshots.forEach((snap2) => {
          const snap1 = v1Map.get(snap2.id);
          if (!snap1) {
            diffs.push({
              documentId: snap2.id,
              documentName: snap2.name,
              categoryName: snap2.categoryName,
              changeType: 'added',
              newValue: '新增',
            });
          } else {
            if (snap1.globalOrder !== snap2.globalOrder) {
              diffs.push({
                documentId: snap2.id,
                documentName: snap2.name,
                categoryName: snap2.categoryName,
                changeType: 'order',
                oldValue: (snap1.globalOrder + 1),
                newValue: (snap2.globalOrder + 1),
              });
            }
            if (snap1.pageNumber !== snap2.pageNumber) {
              diffs.push({
                documentId: snap2.id,
                documentName: snap2.name,
                categoryName: snap2.categoryName,
                changeType: 'page',
                oldValue: snap1.pageNumber ?? '-',
                newValue: snap2.pageNumber ?? '-',
              });
            }
            if (snap1.notes !== snap2.notes) {
              diffs.push({
                documentId: snap2.id,
                documentName: snap2.name,
                categoryName: snap2.categoryName,
                changeType: 'notes',
                oldValue: snap1.notes ?? '',
                newValue: snap2.notes ?? '',
              });
            }
            if (snap1.categoryId !== snap2.categoryId) {
              diffs.push({
                documentId: snap2.id,
                documentName: snap2.name,
                categoryName: snap2.categoryName,
                changeType: 'category',
                oldValue: snap1.categoryName,
                newValue: snap2.categoryName,
              });
            }
          }
        });

        v1.documentSnapshots.forEach((snap1) => {
          if (!v2Map.has(snap1.id)) {
            diffs.push({
              documentId: snap1.id,
              documentName: snap1.name,
              categoryName: snap1.categoryName,
              changeType: 'removed',
              oldValue: '移除',
            });
          }
        });

        return diffs;
      },

      deleteVersion: (versionId) => {
        set((state) => ({
          directoryVersions: state.directoryVersions.filter((v) => v.id !== versionId),
        }));
      },

      detectDuplicates: (volumeId) => {
        const state = get();
        const volCategories = state.categories[volumeId] || [];
        const ignored = new Set(state.ignoredDuplicates);
        const fileMap = new Map<string, DocumentItem[]>();

        volCategories.forEach((cat) => {
          const docs = state.documents[cat.id] || [];
          docs.forEach((doc) => {
            if (doc.file) {
              const key = `${doc.file.name.toLowerCase()}_${doc.file.type}`;
              if (!fileMap.has(key)) {
                fileMap.set(key, []);
              }
              fileMap.get(key)!.push(doc);
            }
          });
        });

        const duplicates: DuplicateFile[] = [];
        fileMap.forEach((docs, key) => {
          if (docs.length > 1) {
            const dupId = `dup_${key}`;
            if (!ignored.has(dupId)) {
              const firstDoc = docs[0];
              duplicates.push({
                id: dupId,
                fileName: firstDoc.file!.name,
                fileType: firstDoc.file!.type,
                documentIds: docs.map((d) => d.id),
                documentNames: docs.map((d) => d.name),
                categoryNames: docs.map((d) => {
                  const cat = volCategories.find((c) => c.id === d.categoryId);
                  return cat?.name || '';
                }),
              });
            }
          }
        });

        return duplicates;
      },

      detectMisplacements: (volumeId) => {
        const state = get();
        const volCategories = state.categories[volumeId] || [];
        const ignored = new Set(state.ignoredMisplacements);
        const misplacements: MisplacedFile[] = [];

        const categoryKeywords: Record<string, string[]> = {
          '开工报审文件': ['开工', '报审', '施工许可', '开工报告'],
          '技术管理文件': ['施工组织', '技术交底', '图纸会审', '设计变更', '洽商', '方案'],
          '质量事故处理记录': ['事故', '质量事故'],
          '建筑与结构': ['钢材', '水泥', '砂', '石', '混凝土', '砂浆', '砖', '砌块', '防水', '门窗', '节能', '保温', '钢筋'],
          '给排水与采暖': ['给水', '排水', '采暖', '管道', '通水', '灌水', '满水', '试压', '管材', '管件'],
          '建筑电气': ['电气', '接地', '绝缘', '照明', '灯具', '电线', '电缆'],
          '通风与空调': ['通风', '空调', '风管', '漏光', '漏风', '调试'],
          '地基基础工程': ['地基', '基础', '土方', '桩', '混凝土垫层'],
          '主体结构工程': ['钢筋', '预埋件', '钢结构', '墙体拉结筋'],
          '建筑装饰装修工程': ['抹灰', '门窗安装', '吊顶', '轻质隔墙', '饰面板', '饰面砖'],
          '屋面工程': ['屋面', '找平层', '保温层', '防水层', '细部构造'],
          '建筑节能工程': ['节能', '墙体节能', '门窗节能', '屋面节能', '地面节能'],
          '机电安装工程': ['给排水', '电气管线', '通风空调', '消防', '管线'],
          '建筑竣工图': ['建筑总平面', '建筑平面', '建筑立面', '建筑剖面', '建筑详图'],
          '结构竣工图': ['基础平面', '基础详图', '结构平面', '结构详图'],
          '机电安装竣工图': ['给排水竣工', '电气竣工', '通风空调竣工', '消防竣工'],
          '分部工程验收': ['分部', '验收记录'],
          '竣工验收': ['竣工', '竣工验收', '备案', '观感', '控制资料', '安全和功能'],
        };

        volCategories.forEach((cat) => {
          const docs = state.documents[cat.id] || [];
          docs.forEach((doc) => {
            if (!doc.file) return;

            let bestCategory = '';
            let bestScore = 0;
            const fileName = doc.name.toLowerCase();

            volCategories.forEach((targetCat) => {
              if (targetCat.id === cat.id) return;
              const keywords = categoryKeywords[targetCat.name] || [];
              let score = 0;
              keywords.forEach((kw) => {
                if (fileName.includes(kw.toLowerCase())) {
                  score += 10;
                }
              });
              if (score > bestScore) {
                bestScore = score;
                bestCategory = targetCat.id;
              }
            });

            if (bestScore >= 20 && bestCategory) {
              const misId = `mis_${doc.id}`;
              if (!ignored.has(misId)) {
                const targetCat = volCategories.find((c) => c.id === bestCategory);
                misplacements.push({
                  id: misId,
                  documentId: doc.id,
                  documentName: doc.name,
                  currentCategoryId: cat.id,
                  currentCategoryName: cat.name,
                  suggestedCategoryId: bestCategory,
                  suggestedCategoryName: targetCat?.name || '',
                  reason: `文件名包含多个「${targetCat?.name || ''}」相关关键词`,
                  confidence: Math.min(bestScore, 100),
                });
              }
            }
          });
        });

        return misplacements;
      },

      ignoreDuplicate: (duplicateId) => {
        set((state) => ({
          ignoredDuplicates: [...state.ignoredDuplicates, duplicateId],
        }));
      },

      ignoreMisplacement: (misplacementId) => {
        set((state) => ({
          ignoredMisplacements: [...state.ignoredMisplacements, misplacementId],
        }));
      },

      moveDocumentToCategory: (documentId, toCategoryId) => {
        const state = get();
        const found = findDocumentById(state.documents, documentId);
        if (!found) return;

        if (found.categoryId === toCategoryId) return;

        const newDocuments = { ...state.documents };
        const fromDocs = [...newDocuments[found.categoryId]];
        const docIndex = fromDocs.findIndex((d) => d.id === documentId);
        if (docIndex === -1) return;

        const [movedDoc] = fromDocs.splice(docIndex, 1);
        fromDocs.forEach((d, i) => { d.order = i; });
        newDocuments[found.categoryId] = fromDocs;

        const toDocs = [...(newDocuments[toCategoryId] || [])];
        const updatedDoc = { ...movedDoc, categoryId: toCategoryId };
        toDocs.push(updatedDoc);
        toDocs.forEach((d, i) => { d.order = i; });
        newDocuments[toCategoryId] = toDocs;

        set({ documents: newDocuments });
      },

      getProjectIssues: (projectId) => {
        const state = get();
        const projectVolumes = state.volumes[projectId] || [];
        const issues: IssueDetail[] = [];

        projectVolumes.forEach((volume) => {
          const cats = state.categories[volume.id] || [];
          cats.forEach((cat) => {
            const docs = state.documents[cat.id] || [];
            docs.forEach((doc) => {
              if (doc.status === '未上传') {
                issues.push({
                  id: `missing_${doc.id}`,
                  type: 'missing',
                  volumeId: volume.id,
                  volumeName: volume.name,
                  categoryId: cat.id,
                  categoryName: cat.name,
                  documentId: doc.id,
                  documentName: doc.name,
                  description: '资料未上传',
                });
              }
              if (doc.status === '缺页') {
                issues.push({
                  id: `pages_${doc.id}`,
                  type: '缺页',
                  volumeId: volume.id,
                  volumeName: volume.name,
                  categoryId: cat.id,
                  categoryName: cat.name,
                  documentId: doc.id,
                  documentName: doc.name,
                  description: '页数为0或缺失',
                });
              }
              if (doc.status === '已上传' && (!doc.pageNumber || doc.pageNumber < 1)) {
                issues.push({
                  id: `unpage_${doc.id}`,
                  type: '未编页码',
                  volumeId: volume.id,
                  volumeName: volume.name,
                  categoryId: cat.id,
                  categoryName: cat.name,
                  documentId: doc.id,
                  documentName: doc.name,
                  description: '已上传但未编排页码',
                });
              }
              if (doc.status === '日期倒挂') {
                issues.push({
                  id: `date_${doc.id}`,
                  type: '日期倒挂',
                  volumeId: volume.id,
                  volumeName: volume.name,
                  categoryId: cat.id,
                  categoryName: cat.name,
                  documentId: doc.id,
                  documentName: doc.name,
                  description: '文件日期早于已有资料日期',
                });
              }
              if (doc.status === '命名不规范') {
                issues.push({
                  id: `name_${doc.id}`,
                  type: '命名不规范',
                  volumeId: volume.id,
                  volumeName: volume.name,
                  categoryId: cat.id,
                  categoryName: cat.name,
                  documentId: doc.id,
                  documentName: doc.name,
                  description: '文件名包含特殊字符',
                });
              }
            });
          });

          const duplicates = get().detectDuplicates(volume.id);
          duplicates.forEach((dup) => {
            dup.documentIds.forEach((docId, idx) => {
              if (idx === 0) return;
              const doc = findDocumentById(state.documents, docId);
              issues.push({
                id: `dup_${dup.id}_${idx}`,
                type: '重复文件',
                volumeId: volume.id,
                volumeName: volume.name,
                categoryId: doc?.categoryId || '',
                categoryName: dup.categoryNames[idx] || '',
                documentId: docId,
                documentName: dup.documentNames[idx] || '',
                description: `与「${dup.documentNames[0]}」为同一文件`,
              });
            });
          });

          const misplacements = get().detectMisplacements(volume.id);
          misplacements.forEach((mis) => {
            issues.push({
              id: mis.id,
              type: '错放分类',
              volumeId: volume.id,
              volumeName: volume.name,
              categoryId: mis.currentCategoryId,
              categoryName: mis.currentCategoryName,
              documentId: mis.documentId,
              documentName: mis.documentName,
              description: `建议移至「${mis.suggestedCategoryName}」`,
            });
          });
        });

        const pageNumberMap = new Map<string, { start: number; end: number; docId: string; docName: string; catId: string; catName: string; volId: string; volName: string }[]>();
        projectVolumes.forEach((volume) => {
          const cats = state.categories[volume.id] || [];
          cats.forEach((cat) => {
            const docs = state.documents[cat.id] || [];
            docs.forEach((doc) => {
              if (doc.status === '已上传' && doc.pageNumber && doc.pageNumber > 0) {
                const pages = doc.file?.pages || 1;
                const start = doc.pageNumber;
                const end = doc.pageNumber + pages - 1;
                if (!pageNumberMap.has(volume.id)) {
                  pageNumberMap.set(volume.id, []);
                }
                pageNumberMap.get(volume.id)!.push({
                  start,
                  end,
                  docId: doc.id,
                  docName: doc.name,
                  catId: cat.id,
                  catName: cat.name,
                  volId: volume.id,
                  volName: volume.name,
                });
              }
            });
          });
        });

        pageNumberMap.forEach((pageRanges) => {
          pageRanges.sort((a, b) => a.start - b.start);
          for (let i = 0; i < pageRanges.length - 1; i++) {
            const curr = pageRanges[i];
            const next = pageRanges[i + 1];
            if (next.start <= curr.end) {
              issues.push({
                id: `overlap_${curr.docId}_${next.docId}`,
                type: '页码重叠',
                volumeId: next.volId,
                volumeName: next.volName,
                categoryId: next.catId,
                categoryName: next.catName,
                documentId: next.docId,
                documentName: next.docName,
                description: `与「${curr.docName}」页码重叠 (第${next.start}-${Math.min(curr.end, next.end)}页)`,
              });
            }
          }
        });

        return issues;
      },

      getIssueSummaries: (projectId) => {
        const issues = get().getProjectIssues(projectId);
        const typeMap = new Map<IssueType, IssueDetail[]>();

        issues.forEach((issue) => {
          if (!typeMap.has(issue.type)) {
            typeMap.set(issue.type, []);
          }
          typeMap.get(issue.type)!.push(issue);
        });

        const typeLabels: Record<IssueType, string> = {
          missing: '缺失资料',
          '缺页': '缺页文件',
          '未编页码': '未编页码',
          '页码重叠': '页码重叠',
          '日期倒挂': '日期倒挂',
          '命名不规范': '命名不规范',
          '重复文件': '重复文件',
          '错放分类': '错放分类',
        };

        const summaries: IssueSummary[] = [];
        (Object.keys(typeLabels) as IssueType[]).forEach((type) => {
          const typeIssues = typeMap.get(type) || [];
          if (typeIssues.length > 0) {
            summaries.push({
              type,
              label: typeLabels[type],
              count: typeIssues.length,
              issues: typeIssues,
            });
          }
        });

        return summaries;
      },

      clearAll: () => {
        set({
          projects: [],
          volumes: {},
          categories: {},
          documents: {},
          currentProjectId: null,
          currentVolumeId: null,
          pendingUploads: [],
          directoryVersions: [],
          ignoredDuplicates: [],
          ignoredMisplacements: [],
        });
      },
    }),
    {
      name: 'project-archive-storage',
    }
  )
);

export default useProjectStore;
