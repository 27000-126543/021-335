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
  ProjectBackup
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
        
        volCategories.sort((a, b) => a.order - b.order).forEach((cat) => {
          const catDocs = state.documents[cat.id] || [];
          catDocs
            .sort((a, b) => (a.globalOrder ?? a.order) - (b.globalOrder ?? b.order))
            .forEach((doc) => {
              docs.push({ ...doc, categoryName: cat.name });
            });
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

      clearAll: () => {
        set({
          projects: [],
          volumes: {},
          categories: {},
          documents: {},
          currentProjectId: null,
          currentVolumeId: null,
          pendingUploads: [],
        });
      },
    }),
    {
      name: 'project-archive-storage',
    }
  )
);

export default useProjectStore;
