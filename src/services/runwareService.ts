import { toast } from "sonner";

const API_ENDPOINT = "wss://ws-api.runware.ai/v1";

export interface GenerateImageParams {
  positivePrompt: string;
  model?: string;
  width?: number;
  height?: number;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  scheduler?: string;
  strength?: number;
  promptWeighting?: "compel" | "sdEmbeds" | "none";
  seed?: number | null;
  lora?: string[];
  steps?: number;
}

export interface GeneratedImage {
  imageURL: string;
  positivePrompt: string;
  seed: number;
  NSFWContent: boolean;
  cost: number;
  taskUUID: string;
}

export interface GenerateVideoParams {
  positivePrompt: string;
  model?: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  motionScale?: number;
  seed?: number | null;
  initImage?: string; // Base64 or URL for image-to-video
  guidance?: number;
}

export interface GeneratedVideo {
  videoURL: string;
  positivePrompt: string;
  duration: number;
  fps: number;
  seed: number;
  cost: number;
  taskUUID: string;
}

export class RunwareService {
  private ws: WebSocket | null = null;
  private apiKey: string | null = null;
  private connectionSessionUUID: string | null = null;
  private messageCallbacks: Map<string, (data: any) => void> = new Map();
  private isAuthenticated: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.connectionPromise = this.connect();
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(API_ENDPOINT);
      
      this.ws.onopen = () => {
        console.log("🚀 Runware WebSocket connecté");
        this.authenticate().then(resolve).catch(reject);
      };

      this.ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        
        if (response.error || response.errors) {
          console.error("❌ Erreur Runware:", response);
          const errorMessage = response.errorMessage || response.errors?.[0]?.message || "Erreur de génération";
          toast.error(`Runware: ${errorMessage}`);
          return;
        }

        if (response.data) {
          response.data.forEach((item: any) => {
            if (item.taskType === "authentication") {
              console.log("✅ Authentification Runware réussie");
              this.connectionSessionUUID = item.connectionSessionUUID;
              this.isAuthenticated = true;
            } else {
              const callback = this.messageCallbacks.get(item.taskUUID);
              if (callback) {
                callback(item);
                this.messageCallbacks.delete(item.taskUUID);
              }
            }
          });
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ Erreur WebSocket Runware:", error);
        toast.error("Erreur de connexion Runware");
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("🔄 Reconnexion Runware...");
        this.isAuthenticated = false;
        setTimeout(() => {
          this.connectionPromise = this.connect();
        }, 2000);
      };
    });
  }

  private authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket non prêt"));
        return;
      }
      
      const authMessage = [{
        taskType: "authentication",
        apiKey: this.apiKey,
        ...(this.connectionSessionUUID && { connectionSessionUUID: this.connectionSessionUUID }),
      }];
      
      console.log("🔐 Authentification Runware...");
      
      const authCallback = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.data?.[0]?.taskType === "authentication") {
          this.ws?.removeEventListener("message", authCallback);
          resolve();
        }
      };
      
      this.ws.addEventListener("message", authCallback);
      this.ws.send(JSON.stringify(authMessage));
    });
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        positivePrompt: params.positivePrompt,
        model: params.model || "runware:100@1",
        width: params.width || 1024,
        height: params.height || 1024,
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "WEBP",
        steps: params.steps || 4,
        CFGScale: params.CFGScale || 7, // Plus élevé = plus fidèle au prompt
        scheduler: params.scheduler || "FlowMatchEulerDiscreteScheduler",
        strength: params.strength || 0.8,
        promptWeighting: params.promptWeighting || "compel", // Meilleur suivi du prompt
        ...(params.seed && { seed: params.seed }),
        lora: params.lora || [],
      }];

      // Supprimer les paramètres non supportés par certains modèles
      if (message[0].model === "runware:100@1") {
        delete message[0].promptWeighting;
      }

      console.log("🎨 Génération Runware:", params.positivePrompt);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage || "Erreur de génération"));
        } else {
          console.log("✅ Image générée avec Runware");
          resolve(data);
        }
      });

      // Timeout de 30 secondes
      setTimeout(() => {
        if (this.messageCallbacks.has(taskUUID)) {
          this.messageCallbacks.delete(taskUUID);
          reject(new Error("Timeout de génération Runware"));
        }
      }, 30000);

      this.ws.send(JSON.stringify(message));
    });
  }

  async generateVideo(params: GenerateVideoParams): Promise<GeneratedVideo> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "videoInference",
        taskUUID,
        positivePrompt: params.positivePrompt,
        model: params.model || "runware:101@1", // Modèle vidéo par défaut
        width: params.width || 768,
        height: params.height || 768,
        duration: params.duration || 3, // 3 secondes par défaut
        fps: params.fps || 24,
        motionScale: params.motionScale || 127, // Échelle de mouvement (0-255)
        guidance: params.guidance || 17.5, // Guidance CFG pour vidéo
        ...(params.seed && { seed: params.seed }),
        ...(params.initImage && { initImage: params.initImage }), // Pour image-to-video
      }];

      console.log("🎬 Génération vidéo Runware:", params.positivePrompt);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage || "Erreur de génération vidéo"));
        } else {
          console.log("✅ Vidéo générée avec Runware");
          resolve(data);
        }
      });

      // Timeout de 60 secondes pour les vidéos (plus long)
      setTimeout(() => {
        if (this.messageCallbacks.has(taskUUID)) {
          this.messageCallbacks.delete(taskUUID);
          reject(new Error("Timeout de génération vidéo Runware"));
        }
      }, 60000);

      this.ws.send(JSON.stringify(message));
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.messageCallbacks.clear();
  }
}