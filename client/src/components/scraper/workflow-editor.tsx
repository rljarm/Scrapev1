import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

interface Props {
  selectedElements: Array<{type: "css" | "xpath", value: string, label: string}>;
  url: string;
  onSave: () => void;
}

export default function WorkflowEditor({ selectedElements, url, onSave }: Props) {
  const [name, setName] = useState("");
  const [requiresJavaScript, setRequiresJavaScript] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

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
          <Switch
            checked={useProxy}
            onCheckedChange={setUseProxy}
          />
        </div>

        <Button 
          className="w-full"
          disabled={!name || !url || selectedElements.length === 0}
          onClick={onSave}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Workflow
        </Button>
      </CardContent>
    </Card>
  );
}
