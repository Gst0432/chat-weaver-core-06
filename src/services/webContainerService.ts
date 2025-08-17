import { WebContainer, FileSystemTree } from '@webcontainer/api';

class WebContainerService {
  private webcontainer: WebContainer | null = null;
  private isBooted = false;

  async initialize(): Promise<void> {
    if (this.webcontainer) return;
    
    try {
      this.webcontainer = await WebContainer.boot();
      this.isBooted = true;
    } catch (error) {
      console.error('Failed to initialize WebContainer:', error);
      throw error;
    }
  }

  async mountFiles(files: FileSystemTree): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    await this.webcontainer.mount(files);
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    await this.webcontainer.fs.writeFile(path, content);
  }

  async readFile(path: string): Promise<string> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    const content = await this.webcontainer.fs.readFile(path, 'utf-8');
    return content;
  }

  async installDependencies(): Promise<{ output: string }> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    const installProcess = await this.webcontainer.spawn('npm', ['install']);
    let output = '';

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
        },
      })
    );

    const exitCode = await installProcess.exit;
    
    return {
      output: output + (exitCode === 0 ? '\n✅ Installation réussie!' : `\n❌ Erreur d'installation (code: ${exitCode})`)
    };
  }

  async runDev(): Promise<{ process: any; url?: string }> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    // Start dev server
    const devProcess = await this.webcontainer.spawn('npm', ['run', 'dev']);
    
    // Listen for server ready event
    this.webcontainer.on('server-ready', (port, url) => {
      console.log(`Server ready at ${url}`);
    });

    return { process: devProcess };
  }

  async stopProcess(process: any): Promise<void> {
    if (process && process.kill) {
      process.kill();
    }
  }

  async getUrl(port = 3000): Promise<string | null> {
    if (!this.webcontainer) return null;
    
    try {
      // WebContainer automatically serves on available ports
      return `http://localhost:${port}`;
    } catch (error) {
      console.error('Failed to get URL:', error);
      return null;
    }
  }

  convertFilesToFileSystemTree(files: any): FileSystemTree {
    const convertStructure = (obj: any): FileSystemTree => {
      const result: FileSystemTree = {};
      
      Object.entries(obj).forEach(([name, file]: [string, any]) => {
        if (file.type === 'file') {
          result[name] = {
            file: {
              contents: file.content
            }
          };
        } else if (file.type === 'folder' && file.children) {
          result[name] = {
            directory: convertStructure(file.children)
          };
        }
      });
      
      return result;
    };

    return convertStructure(files);
  }

  isReady(): boolean {
    return this.isBooted && this.webcontainer !== null;
  }
}

export const webContainerService = new WebContainerService();