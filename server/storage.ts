import { InsertUser, User, Workflow, InsertWorkflow } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workflows: Map<number, Workflow>;
  private currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.workflows = new Map();
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
}

export const storage = new MemStorage();