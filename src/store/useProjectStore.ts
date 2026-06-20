import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectInfo, Volume, Category, DocumentItem, DocumentStatus, ProjectType, FileType, ArchiveCheckItem } from '../types';
import { templates, createId } from '../data/templates';

interface ProjectState {
  projects: ProjectInfo[];
  volumes: Record<string, Volume[]>;
  categories: Record<string, Category[]>;
  documents: Record<string, DocumentItem[]>;
  currentProjectId: string | null;
  currentVolumeId: string | null;
  
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
  
  reorderDocuments: (categoryId: string, documentIds: string[]) => void;
  reorderVolumes: (projectId: string, volumeIds: string[]) => void;
  reorderCategories: (volumeId: string, categoryIds: string[]) => void;
  
  getProjectStats: (projectId: string) => {
    total: number;
    uploaded: number;
    missing: number;
    issues: number;
  };
  
  generateChecklist: (projectId: string) => ArchiveCheckItem[];
  
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
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          volumes: { ...state.volumes, [projectId]: [] },
          currentProjectId: state.currentProjectId === projectId ? null : state.currentProjectId,
          currentVolumeId: state.currentProjectId === projectId ? null : state.currentVolumeId,
        }));
      },

      setCurrentProject: (projectId) => {
        set({ currentProjectId: projectId, currentVolumeId: null });
      },

      setCurrentVolume: (volumeId) => {
        set({ currentVolumeId: volumeId });
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
          categories: { ...state.categories, ...Object.fromEntries(
            Object.entries(categories).map(([k, v]) => [k, v])
          )},
          documents: { ...state.documents, ...Object.fromEntries(
            Object.entries(documents).map(([k, v]) => [k, v])
          )},
        }));
      },

      uploadDocument: (documentId, file) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          
          for (const categoryId of Object.keys(newDocuments)) {
            const docIndex = newDocuments[categoryId].findIndex((d) => d.id === documentId);
            if (docIndex !== -1) {
              const doc = newDocuments[categoryId][docIndex];
              const issues: DocumentStatus[] = [];
              
              const expectedNamePattern = /^[A-Za-z0-9\u4e00-\u9fa5_\-\s]+$/;
              if (!expectedNamePattern.test(file.name)) {
                issues.push('命名不规范');
              }
              
              if (file.documentDate && doc.file?.documentDate) {
                const newDate = new Date(file.documentDate);
                const existingDate = new Date(doc.file.documentDate);
                if (newDate < existingDate) {
                  issues.push('日期倒挂');
                }
              }
              
              if (file.pages === 0) {
                issues.push('缺页');
              }
              
              const status: DocumentStatus = issues.length > 0 ? issues[0] : '已上传';
              
              newDocuments[categoryId][docIndex] = {
                ...doc,
                status,
                file: {
                  ...file,
                  uploadDate: new Date().toISOString(),
                },
              };
              break;
            }
          }
          
          return { documents: newDocuments };
        });
      },

      updateDocumentStatus: (documentId, status) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          for (const categoryId of Object.keys(newDocuments)) {
            const docIndex = newDocuments[categoryId].findIndex((d) => d.id === documentId);
            if (docIndex !== -1) {
              newDocuments[categoryId][docIndex] = {
                ...newDocuments[categoryId][docIndex],
                status,
              };
              break;
            }
          }
          return { documents: newDocuments };
        });
      },

      updateDocumentNotes: (documentId, notes) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          for (const categoryId of Object.keys(newDocuments)) {
            const docIndex = newDocuments[categoryId].findIndex((d) => d.id === documentId);
            if (docIndex !== -1) {
              newDocuments[categoryId][docIndex] = {
                ...newDocuments[categoryId][docIndex],
                notes,
              };
              break;
            }
          }
          return { documents: newDocuments };
        });
      },

      updateDocumentPageNumber: (documentId, pageNumber) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          for (const categoryId of Object.keys(newDocuments)) {
            const docIndex = newDocuments[categoryId].findIndex((d) => d.id === documentId);
            if (docIndex !== -1) {
              newDocuments[categoryId][docIndex] = {
                ...newDocuments[categoryId][docIndex],
                pageNumber,
              };
              break;
            }
          }
          return { documents: newDocuments };
        });
      },

      reorderDocuments: (categoryId, documentIds) => {
        set((state) => {
          const newDocuments = { ...state.documents };
          if (newDocuments[categoryId]) {
            const reordered = documentIds.map((id, index) => {
              const doc = newDocuments[categoryId].find((d) => d.id === id);
              return doc ? { ...doc, order: index } : null;
            }).filter(Boolean) as DocumentItem[];
            
            newDocuments[categoryId] = reordered;
          }
          return { documents: newDocuments };
        });
      },

      reorderVolumes: (projectId, volumeIds) => {
        set((state) => {
          const newVolumes = { ...state.volumes };
          if (newVolumes[projectId]) {
            const reordered = volumeIds.map((id, index) => {
              const vol = newVolumes[projectId].find((v) => v.id === id);
              return vol ? { ...vol, order: index, volumeNumber: `第${index + 1}卷` } : null;
            }).filter(Boolean) as Volume[];
            
            newVolumes[projectId] = reordered;
          }
          return { volumes: newVolumes };
        });
      },

      reorderCategories: (volumeId, categoryIds) => {
        set((state) => {
          const newCategories = { ...state.categories };
          if (newCategories[volumeId]) {
            const reordered = categoryIds.map((id, index) => {
              const cat = newCategories[volumeId].find((c) => c.id === id);
              return cat ? { ...cat, order: index } : null;
            }).filter(Boolean) as Category[];
            
            newCategories[volumeId] = reordered;
          }
          return { categories: newCategories };
        });
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
              remark: hasMissing ? '存在缺失资料' : hasIssue ? '存在问题资料' : undefined,
            });
          }
        });

        checklist.push({
          name: '卷内目录编制完整',
          required: true,
          status: '待检查',
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
          status: '待检查',
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

        return checklist;
      },

      clearAll: () => {
        set({
          projects: [],
          volumes: {},
          categories: {},
          documents: {},
          currentProjectId: null,
          currentVolumeId: null,
        });
      },
    }),
    {
      name: 'project-archive-storage',
    }
  )
);

export default useProjectStore;
