import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  name: string;
  prompt: string;
  files: any;
  createdAt: Date;
  updatedAt: Date;
}

class ProjectService {
  private userId: string | null = null;

  constructor() {
    this.initializeUser();
  }

  private initializeUser(): void {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('userId', userId);
    }
    this.userId = userId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const newProject: Project = {
      ...project,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const projects = this.getProjects();
    projects.push(newProject);
    this.saveProjects(projects);

    return newProject;
  }

  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    const projects = this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === id);
    
    if (projectIndex === -1) return null;

    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: new Date()
    };

    this.saveProjects(projects);
    return projects[projectIndex];
  }

  getProjects(): Project[] {
    if (!this.userId) return [];
    
    const saved = localStorage.getItem(`projects_${this.userId}`);
    if (!saved) return [];

    try {
      return JSON.parse(saved).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to parse projects:', error);
      return [];
    }
  }

  getProject(id: string): Project | null {
    const projects = this.getProjects();
    return projects.find(p => p.id === id) || null;
  }

  deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const filteredProjects = projects.filter(p => p.id !== id);
    
    if (filteredProjects.length === projects.length) return false;
    
    this.saveProjects(filteredProjects);
    return true;
  }

  private saveProjects(projects: Project[]): void {
    if (!this.userId) return;
    localStorage.setItem(`projects_${this.userId}`, JSON.stringify(projects));
  }

  // Project sharing
  encodeProjectForUrl(project: Project): string {
    const shareData = {
      name: project.name,
      prompt: project.prompt,
      files: project.files
    };
    const str = JSON.stringify(shareData);
    return encodeURIComponent(btoa(str));
  }

  decodeProjectFromUrl(encoded: string): Partial<Project> | null {
    try {
      const str = atob(decodeURIComponent(encoded));
      const data = JSON.parse(str);
      return {
        name: data.name + ' (Partagé)',
        prompt: data.prompt,
        files: data.files
      };
    } catch (error) {
      console.error('Failed to decode project from URL:', error);
      return null;
    }
  }

  generateShareUrl(project: Project): string {
    const encoded = this.encodeProjectForUrl(project);
    return `${window.location.origin}${window.location.pathname}?share=${encoded}`;
  }
}

export const projectService = new ProjectService();