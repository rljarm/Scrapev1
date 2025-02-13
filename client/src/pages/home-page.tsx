import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import IframeViewer from "@/components/scraper/iframe-viewer";
import SelectorTools from "@/components/scraper/selector-tools";
import WorkflowEditor from "@/components/scraper/workflow-editor";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [selectedElements, setSelectedElements] = useState<{type: "css" | "xpath", value: string, label: string}[]>([]);

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
            <IframeViewer url={url} onSelectElement={(el) => {
              setSelectedElements([...selectedElements, el]);
              toast({
                title: "Element selected",
                description: `Added ${el.type} selector: ${el.value}`,
              });
            }} />
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
            />

            <WorkflowEditor
              selectedElements={selectedElements}
              url={url}
              onSave={() => {
                toast({
                  title: "Success",
                  description: "Workflow saved successfully",
                });
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
