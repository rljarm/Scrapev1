import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertWorkflowSchema } from "@shared/schema";
import * as cheerio from "cheerio";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Make sure all API routes check for authentication
  const requireAuth = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  };

  app.get("/api/workflows", requireAuth, async (req, res) => {
    const workflows = await storage.getWorkflowsByUserId(req.user!.id);
    res.json(workflows);
  });

  app.post("/api/workflows", requireAuth, async (req, res) => {
    const result = insertWorkflowSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }

    const workflow = await storage.createWorkflow({
      ...result.data,
      userId: req.user!.id,
      lastSaved: new Date().toISOString(),
    });

    res.status(201).json(workflow);
  });

  app.post("/api/scrape", requireAuth, async (req, res) => {
    const { url, selectors } = req.body;
    if (!url || !selectors) {
      return res.status(400).send("Missing url or selectors");
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      clearTimeout(timeoutId);

      const html = await response.text();
      const $ = cheerio.load(html);

      const results = selectors.map((selector: {type: string, value: string}) => {
        if (selector.type === "css") {
          return $(selector.value).text().trim();
        }
        return null;
      }).filter(Boolean);

      res.json({ results });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to scrape URL" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}