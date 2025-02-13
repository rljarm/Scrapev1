import { InsertUser, User, Workflow, InsertWorkflow, Proxy, InsertProxy, ProxySettings, InsertProxySettings, ScrapedFolder, InsertScrapedFolder } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getWorkflowsByUserId(userId: number): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow & { userId: number }): Promise<Workflow>;
  sessionStore: session.Store;

  // Proxy management
  addProxy(proxy: InsertProxy): Promise<Proxy>;
  addProxies(proxies: InsertProxy[]): Promise<Proxy[]>;
  getAvailableProxy(): Promise<Proxy | undefined>;
  updateProxyStatus(id: number, status: 'available' | 'in_use' | 'cooling_down'): Promise<void>;
  updateProxyStats(id: number, responseTime?: number, failed?: boolean): Promise<void>;
  getProxySettings(): Promise<ProxySettings>;
  updateProxySettings(settings: Partial<InsertProxySettings>): Promise<ProxySettings>;

  // Add new methods for scraped folders
  saveScrapedFolder(data: InsertScrapedFolder & { userId: number }): Promise<ScrapedFolder>;
  getScrapedFoldersByUserId(userId: number): Promise<ScrapedFolder[]>;
  getScrapedFoldersByParentUrl(userId: number, parentUrl: string): Promise<ScrapedFolder[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workflows: Map<number, Workflow>;
  private proxies: Map<number, Proxy>;
  private proxySettings: ProxySettings;
  private scrapedFolders: Map<number, ScrapedFolder>;
  private currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.workflows = new Map();
    this.proxies = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
      max: Math.floor(1024 * 1024 * 1024 * 10), // Use up to 10GB for session storage
      ttl: 86400000, // 24 hour TTL
      dispose: (key, n) => {
        n = null;
      },
      stale: false
    });

    // Initialize default proxy settings
    this.proxySettings = {
      id: 0,
      rotationInterval: 300,
      maxConcurrent: 10,
      cooldownPeriod: 600,
      maxFailCount: 3,
      enabled: true,
    };
    this.scrapedFolders = new Map();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWorkflowsByUserId(userId: number): Promise<Workflow[]> {
    return Array.from(this.workflows.values()).filter(
      (workflow) => workflow.userId === userId,
    );
  }

  async createWorkflow(
    workflow: InsertWorkflow & { userId: number; lastSaved: string },
  ): Promise<Workflow> {
    const id = this.currentId++;
    const newWorkflow = { 
      ...workflow,
      id,
      requiresJavaScript: workflow.requiresJavaScript ?? false,
      useProxy: workflow.useProxy ?? false,
    };
    this.workflows.set(id, newWorkflow);
    return newWorkflow;
  }

  async addProxy(proxy: InsertProxy): Promise<Proxy> {
    const id = this.currentId++;
    const newProxy: Proxy = {
      ...proxy,
      id,
      status: 'available',
      lastUsed: null,
      failCount: 0,
      responseTime: null,
    };
    this.proxies.set(id, newProxy);
    return newProxy;
  }

  async addProxies(proxies: InsertProxy[]): Promise<Proxy[]> {
    return Promise.all(proxies.map(proxy => this.addProxy(proxy)));
  }

  async getAvailableProxy(): Promise<Proxy | undefined> {
    const settings = await this.getProxySettings();
    if (!settings.enabled) return undefined;

    const now = new Date();
    const availableProxies = Array.from(this.proxies.values()).filter(proxy => {
      if (proxy.status !== 'available') return false;
      if (proxy.failCount >= settings.maxFailCount) return false;
      if (proxy.status === 'cooling_down' && proxy.lastUsed) {
        const cooldownEnds = new Date(proxy.lastUsed.getTime() + settings.cooldownPeriod * 1000);
        if (now < cooldownEnds) return false;
      }
      return true;
    });

    if (availableProxies.length === 0) return undefined;

    // Sort by last used time and response time
    availableProxies.sort((a, b) => {
      if (!a.lastUsed && !b.lastUsed) return (a.responseTime || 0) - (b.responseTime || 0);
      if (!a.lastUsed) return -1;
      if (!b.lastUsed) return 1;
      return a.lastUsed.getTime() - b.lastUsed.getTime();
    });

    return availableProxies[0];
  }

  async updateProxyStatus(id: number, status: 'available' | 'in_use' | 'cooling_down'): Promise<void> {
    const proxy = this.proxies.get(id);
    if (proxy) {
      proxy.status = status;
      if (status === 'in_use' || status === 'cooling_down') {
        proxy.lastUsed = new Date();
      }
      this.proxies.set(id, proxy);
    }
  }

  async updateProxyStats(id: number, responseTime?: number, failed: boolean = false): Promise<void> {
    const proxy = this.proxies.get(id);
    if (proxy) {
      if (responseTime !== undefined) {
        proxy.responseTime = responseTime;
      }
      if (failed) {
        proxy.failCount += 1;
      } else {
        proxy.failCount = 0;
      }
      this.proxies.set(id, proxy);
    }
  }

  async getProxySettings(): Promise<ProxySettings> {
    return this.proxySettings;
  }

  async updateProxySettings(settings: Partial<InsertProxySettings>): Promise<ProxySettings> {
    this.proxySettings = {
      ...this.proxySettings,
      ...settings,
    };
    return this.proxySettings;
  }

  async saveScrapedFolder(data: InsertScrapedFolder & { userId: number }): Promise<ScrapedFolder> {
    const id = this.currentId++;
    const scrapedFolder: ScrapedFolder = {
      ...data,
      id,
      scrapedAt: new Date(),
    };
    this.scrapedFolders.set(id, scrapedFolder);
    return scrapedFolder;
  }

  async getScrapedFoldersByUserId(userId: number): Promise<ScrapedFolder[]> {
    return Array.from(this.scrapedFolders.values()).filter(
      (folder) => folder.userId === userId
    );
  }

  async getScrapedFoldersByParentUrl(userId: number, parentUrl: string): Promise<ScrapedFolder[]> {
    return Array.from(this.scrapedFolders.values()).filter(
      (folder) => folder.userId === userId && folder.parentUrl === parentUrl
    );
  }
}

export const storage = new MemStorage();