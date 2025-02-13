import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { LogOut, Save } from "lucide-react";
import IframeViewer from "@/components/scraper/iframe-viewer";
import SelectorTools from "@/components/scraper/selector-tools";
import WorkflowEditor from "@/components/scraper/workflow-editor";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InsertWorkflow } from "@shared/schema";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [selectedElements, setSelectedElements] = useState<{
    type: "css" | "xpath";
    value: string;
    label: string;
  }[]>([]);

  const saveMutation = useMutation({
    mutationFn: async (workflow: InsertWorkflow) => {
      const res = await apiRequest("POST", "/api/workflows", workflow);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workflow saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: async (data: { url: string; selectors: typeof selectedElements }) => {
      const res = await apiRequest("POST", "/api/scrape", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scraping Results",
        description: `Found ${data.results.length} matches`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update the auto-save useEffect to provide better feedback
  useEffect(() => {
    if (!url || selectedElements.length === 0) return;

    const timeoutId = setTimeout(() => {
      const workflow: InsertWorkflow = {
        name: `Scrape ${new URL(url).hostname}`,
        targetUrl: url,
        selectors: selectedElements,
        requiresJavaScript: false,
        useProxy: false,
        lastSaved: new Date().toISOString(),
      };

      saveMutation.mutate(workflow, {
        onSuccess: () => {
          toast({
            description: "Changes auto-saved",
            duration: 2000,
          });
        },
        onError: (error) => {
          toast({
            title: "Auto-save failed",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    }, 500); // Reduced debounce time to 500ms for more frequent saves

    return () => clearTimeout(timeoutId);
  }, [url, selectedElements]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Web Scraper</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user?.username}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-4">
            <IframeViewer
              url={url}
              onSelectElement={(el) => {
                setSelectedElements([...selectedElements, el]);
                toast({
                  title: "Element selected",
                  description: `Added ${el.type} selector: ${el.value}`,
                });
              }}
            />
          </Card>

          <div className="space-y-6">
            <SelectorTools
              url={url}
              onUrlChange={setUrl}
              selectedElements={selectedElements}
              onRemoveElement={(index) => {
                const newElements = [...selectedElements];
                newElements.splice(index, 1);
                setSelectedElements(newElements);
              }}
              onScrape={() => {
                if (!url || selectedElements.length === 0) return;
                scrapeMutation.mutate({ url, selectors: selectedElements });
              }}
              isLoading={scrapeMutation.isPending}
            />

            <WorkflowEditor
              selectedElements={selectedElements}
              url={url}
              onSave={(workflow) => {
                saveMutation.mutate(workflow);
              }}
              isLoading={saveMutation.isPending}
            />
          </div>
        </div>
      </main>
    </div>
  );
}