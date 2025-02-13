import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { InsertWorkflow } from "@shared/schema";

interface Props {
  selectedElements: Array<{ type: "css" | "xpath"; value: string; label: string }>;
  url: string;
  onSave: (workflow: InsertWorkflow) => void;
  isLoading?: boolean;
}

export default function WorkflowEditor({
  selectedElements,
  url,
  onSave,
  isLoading = false,
}: Props) {
  const [name, setName] = useState("");
  const [requiresJavaScript, setRequiresJavaScript] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

  const handleSave = () => {
    if (!name || !url || selectedElements.length === 0) return;

    const workflow: InsertWorkflow = {
      name,
      targetUrl: url,
      selectors: selectedElements,
      requiresJavaScript,
      useProxy,
      lastSaved: new Date().toISOString(),
    };

    onSave(workflow);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Workflow Name</Label>
          <Input
            placeholder="Enter workflow name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Requires JavaScript</Label>
          <Switch
            checked={requiresJavaScript}
            onCheckedChange={setRequiresJavaScript}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Use Proxy</Label>
          <Switch checked={useProxy} onCheckedChange={setUseProxy} />
        </div>

        <Button
          className="w-full"
          disabled={!name || !url || selectedElements.length === 0 || isLoading}
          onClick={handleSave}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Workflow
        </Button>
      </CardContent>
    </Card>
  );
}