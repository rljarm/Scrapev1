import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertWorkflowSchema, insertProxySchema, insertProxySettingsSchema, parseProxyString } from "@shared/schema";
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

  app.get("/api/proxy", requireAuth, async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("URL parameter is required");
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      // Get the HTML content
      const html = await response.text();

      // Modify the HTML to handle relative URLs
      const $ = cheerio.load(html);

      // Convert relative URLs to absolute
      $('link[rel="stylesheet"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('http')) {
          $(el).attr('href', new URL(href, targetUrl).toString());
        }
      });

      $('script[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !src.startsWith('http')) {
          $(el).attr('src', new URL(src, targetUrl).toString());
        }
      });

      $('img[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !src.startsWith('http')) {
          $(el).attr('src', new URL(src, targetUrl).toString());
        }
      });

      res.send($.html());
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).send(error instanceof Error ? error.message : 'Failed to fetch URL');
    }
  });

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

  // Proxy management routes
  app.post("/api/proxies/bulk", requireAuth, async (req, res) => {
    try {
      const { proxies, type } = req.body;
      if (!Array.isArray(proxies)) {
        return res.status(400).send("Expected array of proxy strings");
      }

      const parsedProxies = proxies.map(proxyStr => ({
        ...parseProxyString(proxyStr),
        type: type || 'http'
      }));

      const results = await storage.addProxies(parsedProxies);
      res.status(201).json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to add proxies" });
    }
  });

  app.get("/api/proxies/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getProxySettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get proxy settings" });
    }
  });

  app.patch("/api/proxies/settings", requireAuth, async (req, res) => {
    try {
      const result = insertProxySettingsSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(result.error);
      }

      const settings = await storage.updateProxySettings(result.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update proxy settings" });
    }
  });

  app.post("/api/scrape", requireAuth, async (req, res) => {
    const { url, selectors, useProxy } = req.body;
    if (!url || !selectors) {
      return res.status(400).send("Missing url or selectors");
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let proxy = undefined;
      if (useProxy) {
        proxy = await storage.getAvailableProxy();
      }

      const startTime = Date.now();
      const fetchOptions: RequestInit = {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      };

      if (proxy) {
        await storage.updateProxyStatus(proxy.id, 'in_use');
        const proxyUrl = `${proxy.type}://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
        fetchOptions.agent = new (require('https-proxy-agent'))(proxyUrl);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (proxy) {
        const responseTime = Date.now() - startTime;
        await storage.updateProxyStats(proxy.id, responseTime);
        await storage.updateProxyStatus(proxy.id, 'cooling_down');
      }

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
      if (proxy) {
        await storage.updateProxyStats(proxy.id, undefined, true);
        await storage.updateProxyStatus(proxy.id, 'available');
      }

      console.error('Scraping error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to scrape URL" });
    }
  });

  app.post("/api/scraped-folders", requireAuth, async (req, res) => {
    try {
      const result = insertScrapedFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(result.error);
      }

      const scrapedFolder = await storage.saveScrapedFolder({
        ...result.data,
        userId: req.user!.id,
      });

      res.status(201).json(scrapedFolder);
    } catch (error) {
      console.error('Error saving scraped folder:', error);
      res.status(500).json({ error: "Failed to save scraped folder data" });
    }
  });

  app.get("/api/scraped-folders", requireAuth, async (req, res) => {
    try {
      const parentUrl = req.query.parentUrl as string;
      let folders;

      if (parentUrl) {
        folders = await storage.getScrapedFoldersByParentUrl(req.user!.id, parentUrl);
      } else {
        folders = await storage.getScrapedFoldersByUserId(req.user!.id);
      }

      res.json(folders);
    } catch (error) {
      console.error('Error fetching scraped folders:', error);
      res.status(500).json({ error: "Failed to fetch scraped folders" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}